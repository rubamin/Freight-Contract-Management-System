import { useEffect, useState } from "react";
import { getMyPermissions } from "../services/userService";
import { MASTER_APPROVAL_MODULE_KEYS } from "../constants/masterApproval";

const ACTION_FIELDS = { view: "CanView", add: "CanAdd", edit: "CanEdit" };

const findAccess = (list, idField, id) =>
  (list || []).find((entry) => Number(entry[idField]) === Number(id));

// Fetches the logged-in user's permission set once and exposes simple
// canView/canAdd/canEdit(moduleKey) checks (task item 17: "Edit button/
// action must not be displayed" for a module the user can't edit - not
// just disabled server-side). Admins are treated as allowed everywhere,
// matching the backend's own admin bypass in permission.service.js, so
// this hook is the single place UI components need to check rather than
// each one re-implementing the "is this user an admin?" special case.
const usePermissions = () => {
  const [permissions, setPermissions] = useState({
    isAdmin: false,
    isWorkflowApprover: false,
    isMasterApprover: false,
    modulePermissions: {},
    locationAccess: [],
    plantAccess: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getMyPermissions()
      .then((res) => {
        if (isMounted) {
          setPermissions(res.data.data);
          setLoaded(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load permissions", err);
        if (isMounted) setLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const checkPermission = (moduleKey, action) => {
    if (permissions.isAdmin) return true;
    const modulePermission = permissions.modulePermissions?.[moduleKey];
    if (!modulePermission) return false;
    return Boolean(modulePermission[ACTION_FIELDS[action]]);
  };

  // Settings & Hierarchy Access: View / Add / Edit of one location's invoices.
  const canOnLocation = (locationId, action) => {
    if (permissions.isAdmin) return true;
    return Boolean(findAccess(permissions.locationAccess, "LocationID", locationId)?.[ACTION_FIELDS[action]]);
  };

  // An invoice belongs to its LocationID; older invoices without one are
  // matched on their PlantID (same rule as the server).
  const canOnInvoice = (invoice, action) => {
    if (permissions.isAdmin) return true;
    if (invoice?.LocationID) return canOnLocation(invoice.LocationID, action);
    return Boolean(findAccess(permissions.plantAccess, "PlantID", invoice?.PlantID)?.[ACTION_FIELDS[action]]);
  };

  const hasAnyMasterWrite = MASTER_APPROVAL_MODULE_KEYS.some(
    (moduleKey) => checkPermission(moduleKey, "add") || checkPermission(moduleKey, "edit")
  );

  return {
    isAdmin: permissions.isAdmin,
    // Assigned to an approval workflow step - gets the My Approvals page.
    canUseApprovals: Boolean(permissions.isAdmin || permissions.isWorkflowApprover),
    // Can approve master changes, or sends master changes for approval.
    canUseMasterApprovals: Boolean(permissions.isAdmin || permissions.isMasterApprover || hasAnyMasterWrite),
    isMasterApprover: Boolean(permissions.isAdmin || permissions.isMasterApprover),
    loaded,
    canView: (moduleKey) => checkPermission(moduleKey, "view"),
    canAdd: (moduleKey) => checkPermission(moduleKey, "add"),
    canEdit: (moduleKey) => checkPermission(moduleKey, "edit"),
    canOnLocation,
    canOnInvoice,
  };
};

export default usePermissions;

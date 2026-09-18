import { useEffect, useState } from "react";
import { getMyPermissions } from "../services/userService";

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
    modulePermissions: {},
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
    if (action === "view") return Boolean(modulePermission.CanView);
    if (action === "add") return Boolean(modulePermission.CanAdd);
    if (action === "edit") return Boolean(modulePermission.CanEdit);
    return false;
  };

  return {
    isAdmin: permissions.isAdmin,
    loaded,
    canView: (moduleKey) => checkPermission(moduleKey, "view"),
    canAdd: (moduleKey) => checkPermission(moduleKey, "add"),
    canEdit: (moduleKey) => checkPermission(moduleKey, "edit"),
  };
};

export default usePermissions;

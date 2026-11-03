const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  Plant,
  UserLocationPermission,
} = require("../models");
const { isAdminRole } = require("../constants/roles");

// Matches no invoice at all, used when a non-admin user has no plant or
// location access so the list comes back empty instead of unrestricted.
const NO_ACCESS_WHERE = { InvoiceID: { [Op.eq]: -1 } };

const uniqueIds = (ids) => [...new Set(ids.filter((id) => id != null).map(Number))];

// Plants and locations the admin granted View access to in User Master.
const getPermittedLocationRows = (userId) =>
  UserLocationPermission.findAll({
    where: { UserID: userId, CanView: true },
    include: [{ model: Plant, as: "plant", attributes: ["LocationID"] }],
    attributes: ["PlantID", "LocationID"],
  });

// Locations where the user is assigned to an approval workflow step, so
// approvers can open the invoices of the locations they approve for.
const getApproverLocationIds = async (userId) => {
  const rows = await sequelize.query(
    `SELECT DISTINCT s.LocationID
     FROM ApprovalWorkflowStepUsers su
     JOIN ApprovalWorkflowSteps s ON s.StepID = su.StepID
     WHERE su.UserID = :userId`,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );
  return rows.map(({ LocationID }) => LocationID);
};

// Invoices ever assigned to the user, even if the workflow of their
// location changed afterwards.
const getAssignedInvoiceIds = async (userId) => {
  const rows = await sequelize.query(
    "SELECT DISTINCT InvoiceID FROM InvoiceApprovalTasks WHERE AssignedUserID = :userId",
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );
  return rows.map(({ InvoiceID }) => InvoiceID);
};

const getPlantIdsForLocations = async (locationIds) => {
  if (!locationIds.length) {
    return [];
  }

  const plants = await Plant.findAll({
    where: { LocationID: { [Op.in]: locationIds } },
    attributes: ["PlantID"],
    raw: true,
  });
  return plants.map(({ PlantID }) => PlantID);
};

// Resolves every LocationID, PlantID and assigned InvoiceID the user may
// see invoices for.
const getAccessibleScope = async (userId) => {
  const permissionRows = await getPermittedLocationRows(userId);
  const approverLocationIds = await getApproverLocationIds(userId);

  const locationIds = uniqueIds([
    ...permissionRows.map((row) => row.LocationID),
    ...permissionRows.map((row) => row.plant?.LocationID),
    ...approverLocationIds,
  ]);
  const plantIds = uniqueIds([
    ...permissionRows.map((row) => row.PlantID),
    ...(await getPlantIdsForLocations(locationIds)),
  ]);

  return { locationIds, plantIds, invoiceIds: uniqueIds(await getAssignedInvoiceIds(userId)) };
};

// An invoice with a LocationID is matched on that location only. PlantID is
// used only for older invoices saved without a LocationID, because PlantID
// may hold the default fallback plant rather than the selected location.
const buildScopeWhere = ({ locationIds, plantIds, invoiceIds }) => {
  const clauses = [];

  if (invoiceIds.length) {
    clauses.push({ InvoiceID: { [Op.in]: invoiceIds } });
  }

  if (locationIds.length) {
    clauses.push({ LocationID: { [Op.in]: locationIds } });
  }
  if (plantIds.length) {
    clauses.push({
      [Op.and]: [{ LocationID: null }, { PlantID: { [Op.in]: plantIds } }],
    });
  }

  return clauses.length ? { [Op.or]: clauses } : NO_ACCESS_WHERE;
};

// Returns null for admins (no restriction). Every other user only sees
// invoices of the plants/locations they have access to.
const getInvoiceAccessWhere = async (user) => {
  if (isAdminRole(user?.RoleName)) {
    return null;
  }
  if (!user?.UserID) {
    return NO_ACCESS_WHERE;
  }

  const scope = await getAccessibleScope(user.UserID);
  return buildScopeWhere(scope);
};

module.exports = {
  getInvoiceAccessWhere,
};

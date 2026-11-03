const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { Plant, UserLocationPermission } = require("../models");
const { isAdminRole } = require("../constants/roles");

// What a user may do with the invoices of each location, from the
// Settings & Hierarchy Access matrix in User Master. A legacy Plants grant
// counts for the hierarchy Location its Plant is linked to, and a Location
// grant counts for every Plant linked to it (older invoices without a
// LocationID are matched on their PlantID).

const LOCATION_ACTIONS = {
  VIEW: "view",
  ADD: "add",
  EDIT: "edit",
};

const ACTION_FIELDS = {
  [LOCATION_ACTIONS.VIEW]: "CanView",
  [LOCATION_ACTIONS.ADD]: "CanAdd",
  [LOCATION_ACTIONS.EDIT]: "CanEdit",
};

const NO_ACCESS = { CanView: false, CanAdd: false, CanEdit: false };

const mergeFlags = (map, id, row) => {
  if (id == null) return;
  const key = Number(id);
  const current = map.get(key) || NO_ACCESS;
  map.set(key, {
    CanView: current.CanView || Boolean(row.CanView || row.CanAdd || row.CanEdit),
    CanAdd: current.CanAdd || Boolean(row.CanAdd),
    CanEdit: current.CanEdit || Boolean(row.CanEdit),
  });
};

/**
 * @param {number} userId
 * @param {import("sequelize").Transaction} [transaction]
 * @returns {Promise<{locations: Map<number, object>, plants: Map<number, object>}>}
 */
const getLocationAccess = async (userId, transaction) => {
  const rows = await UserLocationPermission.findAll({
    where: { UserID: userId },
    include: [{ model: Plant, as: "plant", attributes: ["PlantID", "LocationID"] }],
    transaction,
  });

  const locations = new Map();
  const plants = new Map();
  rows.forEach((row) => {
    mergeFlags(locations, row.LocationID, row);
    mergeFlags(plants, row.PlantID, row);
    mergeFlags(locations, row.plant?.LocationID, row);
  });

  if (locations.size) {
    const linkedPlants = await Plant.findAll({
      where: { LocationID: { [Op.in]: [...locations.keys()] } },
      attributes: ["PlantID", "LocationID"],
      raw: true,
      transaction,
    });
    linkedPlants.forEach((plant) => mergeFlags(plants, plant.PlantID, locations.get(Number(plant.LocationID))));
  }

  return { locations, plants };
};

const toAccessList = (map, idField) =>
  [...map.entries()].map(([id, flags]) => ({ [idField]: id, ...flags }));

// Plain arrays for the API (permissions/me).
const describeLocationAccess = async (userId) => {
  const { locations, plants } = await getLocationAccess(userId);
  return {
    locationAccess: toAccessList(locations, "LocationID"),
    plantAccess: toAccessList(plants, "PlantID"),
  };
};

const hasAction = (access, { locationId, plantId }, action) => {
  const field = ACTION_FIELDS[action];
  if (locationId) return Boolean(access.locations.get(Number(locationId))?.[field]);
  if (plantId) return Boolean(access.plants.get(Number(plantId))?.[field]);
  return false;
};

// Location IDs the user has the action on (null for an admin = all).
const getLocationIdsWithAction = async (user, action) => {
  if (isAdminRole(user?.RoleName)) return null;
  const { locations } = await getLocationAccess(user.UserID);
  const field = ACTION_FIELDS[action];
  return [...locations.entries()].filter(([, flags]) => flags[field]).map(([id]) => id);
};

const isAssignedApprover = async (userId, invoiceId, transaction) => {
  const rows = await sequelize.query(
    "SELECT TOP 1 1 AS Found FROM InvoiceApprovalTasks WHERE InvoiceID = :invoiceId AND AssignedUserID = :userId",
    { replacements: { invoiceId, userId }, type: QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
};

const accessError = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

/**
 * Throws 403 unless the user may add an invoice for this location.
 * Admins always pass.
 */
const assertCanAddInvoice = async ({ user, access, locationId, locationName, invoiceNo }) => {
  if (isAdminRole(user?.RoleName)) return;
  if (!locationId) {
    throw accessError(`Invoice ${invoiceNo}: select a location you have Add access to.`);
  }
  if (!hasAction(access, { locationId }, LOCATION_ACTIONS.ADD)) {
    throw accessError(`Invoice ${invoiceNo}: you do not have Add access to location ${locationName || `#${locationId}`}. Ask your admin, or use Request Access in My Settings.`);
  }
};

/**
 * Throws 403 unless the user may edit this invoice: Edit access to its
 * location, or it was assigned to the user for approval. A changed
 * location also needs Edit access. Admins always pass.
 */
const assertCanEditInvoice = async ({ user, access, invoice, newLocationId, newLocationName, transaction }) => {
  if (isAdminRole(user?.RoleName)) return;
  const current = { locationId: invoice.LocationID, plantId: invoice.PlantID };
  const canEditCurrent = hasAction(access, current, LOCATION_ACTIONS.EDIT)
    || (await isAssignedApprover(user.UserID, invoice.InvoiceID, transaction));
  if (!canEditCurrent) {
    throw accessError(`Invoice ${invoice.InvoiceNumber}: you do not have Edit access to location ${invoice.LocationName || "of this invoice"}.`);
  }
  const locationChanged = newLocationId && Number(newLocationId) !== Number(invoice.LocationID);
  if (locationChanged && !hasAction(access, { locationId: newLocationId }, LOCATION_ACTIONS.EDIT)) {
    throw accessError(`Invoice ${invoice.InvoiceNumber}: you do not have Edit access to location ${newLocationName || `#${newLocationId}`}.`);
  }
};

module.exports = {
  LOCATION_ACTIONS,
  getLocationAccess,
  describeLocationAccess,
  getLocationIdsWithAction,
  assertCanAddInvoice,
  assertCanEditInvoice,
};

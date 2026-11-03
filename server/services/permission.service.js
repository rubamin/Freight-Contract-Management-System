const {
  User,
  Role,
  UserModulePermission,
  UserLocationPermission,
  Plant,
  PlantLocation,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { MODULE_KEYS } = require("../constants/modules");
const { isAdminRole } = require("../constants/roles");
const { isWorkflowMember } = require("./approvalWorkflow.service");
const { isMasterApprover } = require("./masterApproval.service");
const { describeLocationAccess } = require("../utils/locationAccess");

// Returns every module permission row for a user, keyed by ModuleKey, so
// the frontend (sidebar, permission matrix) can look each one up directly
// instead of scanning an array.
const getUserPermissions = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: "role" }],
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const isAdmin = isAdminRole(user.role?.RoleName);

  const modulePermissionRows = await UserModulePermission.findAll({
    where: { UserID: userId },
  });

  const modulePermissions = {};
  Object.values(MODULE_KEYS).forEach((key) => {
    const row = modulePermissionRows.find((r) => r.ModuleKey === key);
    // An admin implicitly has full access to every module regardless of
    // what's stored, so the sidebar/permission checks never need a special
    // case for "is this user an admin?" anywhere else in the codebase.
    modulePermissions[key] = isAdmin
      ? { CanView: true, CanAdd: true, CanEdit: true }
      : {
          CanView: Boolean(row?.CanView),
          CanAdd: Boolean(row?.CanAdd),
          CanEdit: Boolean(row?.CanEdit),
        };
  });

  const locationPermissions = await UserLocationPermission.findAll({
    where: { UserID: userId },
    include: [
      { model: Plant, as: "plant" },
      { model: PlantLocation, as: "location" },
    ],
  });

  // My Approvals is only for users assigned to an approval workflow step.
  const isWorkflowApprover = await isWorkflowMember(userId);
  // Master Approvals "Waiting for me" is for master approvers.
  const isMasterChangeApprover = await isMasterApprover(userId);
  // Resolved View / Add / Edit per location and per legacy plant.
  const { locationAccess, plantAccess } = await describeLocationAccess(userId);

  return {
    isAdmin,
    isWorkflowApprover,
    isMasterApprover: isMasterChangeApprover,
    modulePermissions,
    locationPermissions,
    locationAccess,
    plantAccess,
  };
};

// Replaces a user's full module-permission set in one call (the User
// Master permission matrix always submits every module row together).
const setUserModulePermissions = async (userId, permissions = []) => {
  await UserModulePermission.destroy({ where: { UserID: userId } });

  const rows = permissions
    .filter((p) => Object.values(MODULE_KEYS).includes(p.moduleKey))
    .map((p) => ({
      UserID: userId,
      ModuleKey: p.moduleKey,
      CanView: Boolean(p.canView),
      CanAdd: Boolean(p.canAdd),
      CanEdit: Boolean(p.canEdit),
    }));

  if (rows.length) {
    await UserModulePermission.bulkCreate(rows);
  }

  return getUserPermissions(userId);
};

// One row per location; Add or Edit always includes View, and a row with
// no flag at all is dropped.
const normalizeLocationGrants = (locations) => {
  const byId = new Map();
  (Array.isArray(locations) ? locations : []).forEach((grant) => {
    const locationId = Number(grant.locationId);
    if (!Number.isInteger(locationId) || locationId <= 0) return;
    const canAdd = Boolean(grant.canAdd);
    const canEdit = Boolean(grant.canEdit);
    const canView = Boolean(grant.canView) || canAdd || canEdit;
    if (canView) byId.set(locationId, { LocationID: locationId, CanView: canView, CanAdd: canAdd, CanEdit: canEdit });
  });
  return [...byId.values()];
};

const assertKnownLocations = async (grants, transaction) => {
  if (!grants.length) return;
  const ids = grants.map((grant) => grant.LocationID);
  const found = await PlantLocation.count({ where: { LocationID: { [Op.in]: ids } }, transaction });
  if (found !== ids.length) throw new Error("One or more selected locations no longer exist.");
};

// Plants linked to the granted locations get the same flags, so the
// Default Plant list in My Settings follows the location grants.
const buildLinkedPlantRows = async (userId, grants, transaction) => {
  if (!grants.length) return [];
  const plants = await Plant.findAll({
    where: { LocationID: { [Op.in]: grants.map((grant) => grant.LocationID) } },
    attributes: ["PlantID", "LocationID"],
    raw: true,
    transaction,
  });
  return plants.map((plant) => {
    const grant = grants.find((item) => item.LocationID === Number(plant.LocationID));
    return { UserID: userId, PlantID: plant.PlantID, CanView: grant.CanView, CanAdd: grant.CanAdd, CanEdit: grant.CanEdit };
  });
};

// Replaces a user's full Settings & Hierarchy Access matrix:
// [{ locationId, canView, canAdd, canEdit }]. Invoices are viewed, added
// and edited only for these locations.
const setUserLocationPermissions = async (userId, locations = []) => {
  const grants = normalizeLocationGrants(locations);

  await sequelize.transaction(async (transaction) => {
    await assertKnownLocations(grants, transaction);
    await UserLocationPermission.destroy({ where: { UserID: userId }, transaction });
    const rows = [
      ...grants.map((grant) => ({ UserID: userId, ...grant })),
      ...(await buildLinkedPlantRows(userId, grants, transaction)),
    ];
    if (rows.length) {
      await UserLocationPermission.bulkCreate(rows, { transaction });
      await sequelize.query("UPDATE UserLocationPermission SET UpdatedAt = GETDATE() WHERE UserID = :userId", {
        replacements: { userId },
        transaction,
      });
    }
  });

  return getUserPermissions(userId);
};

const ACTION_FIELDS = { view: "CanView", add: "CanAdd", edit: "CanEdit" };

// Single-permission check used by the requireModulePermission middleware.
// Admins pass every check; everyone else needs the matching row and action.
const hasModulePermission = async (userId, moduleKey, action) => {
  const user = await User.findByPk(userId, { include: [{ model: Role, as: "role" }] });
  if (!user) return false;
  if (isAdminRole(user.role?.RoleName)) return true;

  const field = ACTION_FIELDS[action];
  if (!field) return false;
  const row = await UserModulePermission.findOne({ where: { UserID: userId, ModuleKey: moduleKey } });
  return Boolean(row?.[field]);
};

module.exports = {
  getUserPermissions,
  setUserModulePermissions,
  setUserLocationPermissions,
  hasModulePermission,
};

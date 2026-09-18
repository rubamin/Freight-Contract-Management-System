const {
  User,
  Role,
  UserModulePermission,
  UserLocationPermission,
  Plant,
} = require("../models");
const { MODULE_KEYS } = require("../constants/modules");
const { isAdminRole } = require("../constants/roles");

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
    include: [{ model: Plant, as: "plant" }],
  });

  return { isAdmin, modulePermissions, locationPermissions };
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

// Replaces a user's full location-permission set (which plants they may
// access/select as their default plant - task item 4's hierarchy scoping
// and task item 5's Default Plant list).
const setUserLocationPermissions = async (userId, plantIds = []) => {
  await UserLocationPermission.destroy({ where: { UserID: userId } });

  const rows = plantIds.map((plantId) => ({
    UserID: userId,
    PlantID: plantId,
    CanView: true,
  }));

  if (rows.length) {
    await UserLocationPermission.bulkCreate(rows);
  }

  return getUserPermissions(userId);
};

// Single-permission check used by the requireModulePermission middleware.
// Admins pass every check; everyone else needs the matching row and action.
const hasModulePermission = async (userId, moduleKey, action) => {
  const { isAdmin, modulePermissions } = await getUserPermissions(userId);
  if (isAdmin) return true;

  const permission = modulePermissions[moduleKey];
  if (!permission) return false;

  if (action === "view") return permission.CanView;
  if (action === "add") return permission.CanAdd;
  if (action === "edit") return permission.CanEdit;
  return false;
};

module.exports = {
  getUserPermissions,
  setUserModulePermissions,
  setUserLocationPermissions,
  hasModulePermission,
};

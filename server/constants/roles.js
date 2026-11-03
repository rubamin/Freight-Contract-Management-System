// The one role name treated as a full administrator (sees every sidebar
// module and bypasses per-module/per-location permission checks). Seed
// data must include a Roles row with this exact RoleName for admin access
// to work.
const ADMIN_ROLE_NAME = "Admin";

const isAdminRole = (roleName) =>
  String(roleName || "").trim().toLowerCase() === ADMIN_ROLE_NAME.toLowerCase();

module.exports = { ADMIN_ROLE_NAME, isAdminRole };

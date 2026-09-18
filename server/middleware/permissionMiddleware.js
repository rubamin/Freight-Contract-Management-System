const { isAdminRole } = require("../constants/roles");
const permissionService = require("../services/permission.service");

// Restricts a route to the Admin role only. Assumes authMiddleware has
// already run and populated req.user.RoleName.
const requireAdmin = (req, res, next) => {
  if (!isAdminRole(req.user?.RoleName)) {
    return res.status(403).json({
      success: false,
      message: "This action requires administrator access.",
    });
  }
  next();
};

// Restricts a route to users who have the given action (view/add/edit) on
// the given module, per their UserModulePermission rows. Admins always
// pass. Assumes authMiddleware has already run.
const requireModulePermission = (moduleKey, action) => {
  return async (req, res, next) => {
    try {
      const allowed = await permissionService.hasModulePermission(
        req.user.UserID,
        moduleKey,
        action
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
};

module.exports = { requireAdmin, requireModulePermission };

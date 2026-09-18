const roleMiddleware = (...allowedRoleIds) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
    }

    if (
      allowedRoleIds.length &&
      !allowedRoleIds.includes(Number(req.user.RoleID))
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
};

module.exports = roleMiddleware;

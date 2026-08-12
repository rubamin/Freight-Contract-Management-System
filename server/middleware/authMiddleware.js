const { verifyToken } = require("../helpers/jwt");
const { User } = require("../models");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.UserID);

    if (!user || !user.IsActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive user.",
      });
    }

    req.user = {
      UserID: user.UserID,
      RoleID: user.RoleID,
      Email: user.Email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = authMiddleware;

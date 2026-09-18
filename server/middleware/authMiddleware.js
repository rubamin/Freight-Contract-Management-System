const { verifyToken } = require("../helpers/jwt");
<<<<<<< HEAD
const { User, Role } = require("../models");
=======
const { User } = require("../models");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

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

<<<<<<< HEAD
    const user = await User.findByPk(decoded.UserID, {
      include: [{ model: Role, as: "role", attributes: ["RoleName"] }],
    });
=======
    const user = await User.findByPk(decoded.UserID);
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

    if (!user || !user.IsActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive user.",
      });
    }

    req.user = {
      UserID: user.UserID,
      RoleID: user.RoleID,
<<<<<<< HEAD
      RoleName: user.role?.RoleName || null,
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/permissionMiddleware");
const upload = require("../middleware/uploadMiddelware");
const {
  validateUpdateProfile,
  validateChangePassword,
  validateUpdatePreferences,
} = require("../validators/userValidator");

// All routes here require an authenticated user. authMiddleware runs first
// so req.user is populated before the profile-photo filename callback and
// the controllers run.
router.put(
  "/profile",
  authMiddleware,
  upload.profilePhoto,
  validateUpdateProfile,
  userController.updateProfile
);

router.put(
  "/change-password",
  authMiddleware,
  validateChangePassword,
  userController.changePassword
);

router.get("/preferences", authMiddleware, userController.getPreferences);

router.put(
  "/preferences",
  authMiddleware,
  validateUpdatePreferences,
  userController.updatePreferences
);

router.post(
  "/preferences/request-location-access",
  authMiddleware,
  userController.requestLocationAccess
);

// ==========================================
//  ADMIN USER MANAGEMENT (task item 4) - all admin-only
// ==========================================
router.get("/roles", authMiddleware, userController.getRoles);
router.get("/", authMiddleware, requireAdmin, userController.listUsers);
router.get("/:id", authMiddleware, requireAdmin, userController.getUserById);
router.post("/", authMiddleware, requireAdmin, userController.createUser);
router.put("/:id", authMiddleware, requireAdmin, userController.updateUser);
router.put("/:id/active", authMiddleware, requireAdmin, userController.setUserActive);

module.exports = router;

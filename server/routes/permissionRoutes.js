const express = require("express");
const router = express.Router();

const permissionController = require("../controllers/permissionController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/permissionMiddleware");

router.use(authMiddleware);

// Logged-in user's own permissions (sidebar, My Settings default plant list).
router.get("/me", permissionController.getMyPermissions);

// Admin-only: view/edit any user's permissions from the User Master page.
router.get("/:userId", requireAdmin, permissionController.getPermissions);
router.put("/:userId/modules", requireAdmin, permissionController.updateModulePermissions);
router.put("/:userId/locations", requireAdmin, permissionController.updateLocationPermissions);

module.exports = router;

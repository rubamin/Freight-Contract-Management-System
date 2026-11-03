const express = require("express");
const databaseMaintenanceController = require("../controllers/databaseMaintenanceController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Destructive, whole-module operations - Admin role only.
router.use(authMiddleware, requireAdmin);

router.get("/modules", databaseMaintenanceController.getModules);
router.post("/modules/:moduleKey", databaseMaintenanceController.runMaintenance);

module.exports = router;

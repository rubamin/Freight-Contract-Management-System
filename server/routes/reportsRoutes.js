const express = require("express");
const router = express.Router();

const reportsController = require("../controllers/reportsController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireModulePermission } = require("../middleware/permissionMiddleware");
const { MODULE_KEYS } = require("../constants/modules");

router.use(authMiddleware, requireModulePermission(MODULE_KEYS.REPORTS, "view"));

// GET /api/reports/invoices/export?from=&to=&vendorId=&plantId=&statusId=
router.get("/invoices/export", reportsController.exportInvoices);

// On-screen reports: the list the user can open, then one report's data.
router.get("/catalog", reportsController.getCatalog);
router.get("/data/:reportKey", reportsController.getReport);

module.exports = router;

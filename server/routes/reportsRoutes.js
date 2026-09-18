const express = require("express");
const router = express.Router();

const reportsController = require("../controllers/reportsController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/reports/invoices/export?from=&to=&vendorId=&plantId=&statusId=
router.get("/invoices/export", authMiddleware, reportsController.exportInvoices);

module.exports = router;

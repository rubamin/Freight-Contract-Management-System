const express = require("express");

const router = express.Router();

const vendorController = require("../controllers/vendor.controller");
const {
  validateVendor,
} = require("../validations/vendor.validation");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddelware"); // Import upload middleware supporting vendorExcel
const { holdForApproval } = require("../middleware/masterApprovalMiddleware");
const { MODULE_KEYS } = require("../constants/modules");
const { MASTER_ACTIONS, MASTER_REQUEST_OPERATIONS } = require("../constants/masterApproval");

router.use(authMiddleware);

/**
 * ==============================
 * Vendor CRUD & Bulk Upload Routes
 * ==============================
 */

// Bulk Upload Vendors from Excel Spreadsheet
router.post(
  "/bulk-upload",
  upload.vendorExcel,
  holdForApproval(MODULE_KEYS.VENDOR_MASTER, MASTER_ACTIONS.ADD, MASTER_REQUEST_OPERATIONS.BULK),
  vendorController.bulkUploadVendors
);

// Create Vendor
router.post(
  "/",
  validateVendor,
  holdForApproval(MODULE_KEYS.VENDOR_MASTER, MASTER_ACTIONS.ADD),
  vendorController.createVendor
);

// Get All Vendors
router.get(
  "/",
  vendorController.getAllVendors
);

// Get Vendor By ID
router.get(
  "/:id",
  vendorController.getVendorById
);

// Update Vendor
router.put(
  "/:id",
  validateVendor,
  holdForApproval(MODULE_KEYS.VENDOR_MASTER, MASTER_ACTIONS.EDIT),
  vendorController.updateVendor
);

// Delete Vendor
router.delete(
  "/:id",
  vendorController.deleteVendor
);

module.exports = router;
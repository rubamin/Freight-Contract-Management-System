const express = require("express");

const router = express.Router();

const vendorController = require("../controllers/vendor.controller");
const {
  validateVendor,
} = require("../validations/vendor.validation");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddelware"); // Import upload middleware supporting vendorExcel

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
  vendorController.bulkUploadVendors
);

// Create Vendor
router.post(
  "/",
  validateVendor,
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
  vendorController.updateVendor
);

// Delete Vendor
router.delete(
  "/:id",
  vendorController.deleteVendor
);

module.exports = router;
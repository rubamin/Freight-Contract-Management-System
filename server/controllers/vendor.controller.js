const vendorService = require("../services/vendor.services");
const XLSX = require("xlsx");

/**
 * Create Vendor Profile Record Row
 */
const createVendor = async (req, res) => {
  try {
    const vendor = await vendorService.createVendor(req.body);

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      data: vendor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Vendors Dynamic Grid List datasets
 */
const getAllVendors = async (req, res) => {
  try {
    const result = await vendorService.getAllVendors(req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Vendor By Unique Primary Reference ID
 */
const getVendorById = async (req, res) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Existing Vendor Information Details
 */
const updateVendor = async (req, res) => {
  try {
    const vendor = await vendorService.updateVendor(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully.",
      data: vendor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete Vendor Profile Instance
 */
const deleteVendor = async (req, res) => {
  try {
    await vendorService.deleteVendor(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Bulk Upload Vendors from Excel Spreadsheet
 * Processes uploaded files, reads multi-GST attributes, and handles database persistence
 */
const bulkUploadVendors = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload a valid Excel spreadsheet.",
      });
    }

    let workbook;

    // Check karo ke file memory buffer ma chhe ke disk path par
    if (req.file.buffer) {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } else if (req.file.path) {
      workbook = XLSX.readFile(req.file.path);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid file uploaded. File buffer or path missing.",
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log("Parsed Excel Raw Data:", rawData);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The uploaded Excel sheet contains no valid data rows.",
      });
    }

    const result = await vendorService.bulkUploadVendors(rawData, req.user?.id);

    return res.status(200).json({
      success: true,
      message: `Successfully processed bulk vendor upload. Added: ${result.successCount} records.`,
      data: result,
    });
  } catch (error) {
    console.error("Bulk Upload Controller Error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to process bulk vendor excel file upload.",
    });
  }
};

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  bulkUploadVendors,
};
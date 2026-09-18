<<<<<<< HEAD
const XLSX = require("xlsx");
const crudService = require("../services/crud.service");
const { describeSequelizeError } = require("../utils/dbErrorHelper");
=======
const crudService = require("../services/crud.service");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

const getAll = async (req, res) => {
  try {
    const result = await crudService.getAll(req.moduleConfig, req.query);

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

const getById = async (req, res) => {
  try {
    const record = await crudService.getById(req.moduleConfig, req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const create = async (req, res) => {
  try {
    const record = await crudService.create(req.moduleConfig, req.body, req);

    return res.status(201).json({
      success: true,
      message: "Record created successfully.",
      data: record,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
<<<<<<< HEAD
      message: describeSequelizeError(error),
=======
      message: error.message,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    });
  }
};

const update = async (req, res) => {
  try {
    const record = await crudService.update(
      req.moduleConfig,
      req.params.id,
      req.body,
      req
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Record updated successfully.",
      data: record,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
<<<<<<< HEAD
      message: describeSequelizeError(error),
=======
      message: error.message,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    });
  }
};

const remove = async (req, res) => {
  try {
    const record = await crudService.remove(
      req.moduleConfig,
      req.params.id,
      req
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Record deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

<<<<<<< HEAD
// Generic bulk-upload endpoint (task item 11). Only enabled for modules
// whose registry entry defines `bulkUploadFields` - moduleRouteFactory
// only mounts this route for those modules in the first place, but the
// config is checked again here as a defensive guard.
const bulkUpload = async (req, res) => {
  try {
    if (!req.moduleConfig.bulkUploadFields) {
      return res.status(404).json({
        success: false,
        message: "Bulk upload is not available for this module.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload a valid Excel/CSV spreadsheet.",
      });
    }

    const workbook = req.file.buffer
      ? XLSX.read(req.file.buffer, { type: "buffer" })
      : XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "The uploaded spreadsheet contains no data rows.",
      });
    }

    const result = await crudService.bulkUpload(req.moduleConfig, rows, req);

    return res.status(200).json({
      success: true,
      message: `Processed ${rows.length} rows: ${result.successCount} added, ${result.errorCount} failed.`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to process the uploaded file.",
    });
  }
};

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
<<<<<<< HEAD
  bulkUpload,
};
=======
};
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

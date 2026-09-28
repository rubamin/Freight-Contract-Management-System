const crudService = require("../services/crud.service");


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
      message: error.message,

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
      message: error.message,

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


module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};


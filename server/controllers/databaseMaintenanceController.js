const databaseMaintenanceService = require("../services/databaseMaintenance.service");
const logger = require("../utils/logger");
const { MAINTENANCE_ACTIONS } = require("../constants/databaseMaintenance");

const sendError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;
  if (statusCode === 500) {
    logger.error(fallbackMessage, { message: error.message });
  }
  return res.status(statusCode).json({
    success: false,
    message: error.statusCode ? error.message : `${fallbackMessage} ${error.message}`,
    errors: error.details || null,
  });
};

const getModules = async (req, res) => {
  try {
    const modules = await databaseMaintenanceService.getModuleSummaries();
    return res.status(200).json({ success: true, data: modules });
  } catch (error) {
    return sendError(res, error, "Failed to load module data summary.");
  }
};

const runMaintenance = async (req, res) => {
  try {
    const result = await databaseMaintenanceService.runMaintenance(
      {
        moduleKey: req.params.moduleKey,
        action: req.body.action,
        confirmation: req.body.confirmation,
      },
      req
    );
    const verb = result.action === MAINTENANCE_ACTIONS.TRUNCATE ? "truncated" : "deleted";
    return res.status(200).json({
      success: true,
      message: `${result.label} data ${verb} successfully (${result.totalDeleted} rows removed).${
        result.dependentModules.length
          ? ` Dependent modules also cleared: ${result.dependentModules.map((module) => module.label).join(", ")}.`
          : ""
      }`,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, "Database maintenance failed. No data was changed.");
  }
};

module.exports = { getModules, runMaintenance };

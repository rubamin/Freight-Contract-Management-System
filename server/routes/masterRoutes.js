const createModuleRouter = require("./moduleRouteFactory");
const masterModuleRegistry = require("../config/masterModuleRegistry");
const { MASTER_APPROVAL_MODULE_KEYS } = require("../constants/masterApproval");

// Add / Edit / bulk upload of the masters listed in
// MASTER_APPROVAL_MODULE_KEYS can be held for approval (Master Approval
// Workflow); plants and statuses are never held.
module.exports = createModuleRouter(masterModuleRegistry, {
  approvalModuleKeys: MASTER_APPROVAL_MODULE_KEYS,
});

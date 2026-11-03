const express = require("express");
const crudController = require("../controllers/crud.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/permissionMiddleware");
const { holdForApproval } = require("../middleware/masterApprovalMiddleware");
const { MASTER_ACTIONS, MASTER_REQUEST_OPERATIONS } = require("../constants/masterApproval");
const upload = require("../middleware/uploadMiddelware");

// approvalModuleKeys: registry modules whose Add / Edit / bulk upload may
// be held for approval. Every other module saves directly.
const createModuleRouter = (registry, { approvalModuleKeys = [] } = {}) => {
  const router = express.Router();

  router.use(authMiddleware);

  router.param("module", (req, res, next, moduleName) => {
    const moduleConfig = registry[moduleName];

    if (!moduleConfig) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    req.moduleConfig = moduleConfig;
    next();
  });

  const approvalModuleKeyOf = (req) =>
    (approvalModuleKeys.includes(req.params.module) ? req.params.module : null);

  // Bulk Excel/CSV upload (task item 11) - only ever reachable for modules
  // whose registry entry opts in via bulkUploadFields. Contract Master and
  // Invoices are deliberately never given this field, so this route 404s
  // for them via crud.controller's own guard.
  router.post(
    "/:module/bulk-upload",
    upload.moduleExcel,
    holdForApproval(approvalModuleKeyOf, MASTER_ACTIONS.ADD, MASTER_REQUEST_OPERATIONS.BULK),
    crudController.bulkUpload
  );

  router.get("/:module", crudController.getAll);
  router.get("/:module/:id", crudController.getById);
  router.post("/:module", holdForApproval(approvalModuleKeyOf, MASTER_ACTIONS.ADD), crudController.create);
  router.put("/:module/:id", holdForApproval(approvalModuleKeyOf, MASTER_ACTIONS.EDIT), crudController.update);
  router.delete("/:module/:id", crudController.remove);
  // Permanent delete - Admin role only, and only for modules whose
  // registry entry sets allowHardDelete.
  router.delete("/:module/:id/hard", requireAdmin, crudController.hardRemove);

  return router;
};

module.exports = createModuleRouter;

const express = require("express");
const crudController = require("../controllers/crud.controller");
const authMiddleware = require("../middleware/authMiddleware");
<<<<<<< HEAD
const upload = require("../middleware/uploadMiddelware");
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

const createModuleRouter = (registry) => {
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

<<<<<<< HEAD
  // Bulk Excel/CSV upload (task item 11) - only ever reachable for modules
  // whose registry entry opts in via bulkUploadFields. Contract Master and
  // Invoices are deliberately never given this field, so this route 404s
  // for them via crud.controller's own guard.
  router.post("/:module/bulk-upload", upload.moduleExcel, crudController.bulkUpload);

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  router.get("/:module", crudController.getAll);
  router.get("/:module/:id", crudController.getById);
  router.post("/:module", crudController.create);
  router.put("/:module/:id", crudController.update);
  router.delete("/:module/:id", crudController.remove);

  return router;
};

module.exports = createModuleRouter;

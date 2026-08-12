const express = require("express");
const crudController = require("../controllers/crud.controller");
const authMiddleware = require("../middleware/authMiddleware");

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

  router.get("/:module", crudController.getAll);
  router.get("/:module/:id", crudController.getById);
  router.post("/:module", crudController.create);
  router.put("/:module/:id", crudController.update);
  router.delete("/:module/:id", crudController.remove);

  return router;
};

module.exports = createModuleRouter;

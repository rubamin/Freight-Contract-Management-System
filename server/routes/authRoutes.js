const express = require("express");
const authController = require("../controllers/authController");
const {
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateSetPassword,
} = require("../validators/authValidator");
const authMiddleware = require("../middleware/authMiddleware");

const { passwordRouteAuth } = authMiddleware;
const router = express.Router();

router.post("/login", validateLogin, authController.login);
router.get("/me", passwordRouteAuth, authController.me);
router.post("/set-password", passwordRouteAuth, validateSetPassword, authController.setPassword);
router.post("/forgot-password", validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", validateResetPassword, authController.resetPassword);

module.exports = router;

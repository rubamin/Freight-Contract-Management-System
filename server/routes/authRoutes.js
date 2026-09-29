const express = require("express");
const authController = require("../controllers/authController");
const {
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators/authValidator");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", validateLogin, authController.login);
router.get("/me", authMiddleware, authController.me);
router.post("/forgot-password", validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", validateResetPassword, authController.resetPassword);

module.exports = router;

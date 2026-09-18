const express = require("express");
const authController = require("../controllers/authController");
<<<<<<< HEAD
const {
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators/authValidator");
=======
const { validateLogin } = require("../validators/authValidator");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", validateLogin, authController.login);
router.get("/me", authMiddleware, authController.me);
<<<<<<< HEAD
router.post("/forgot-password", validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", validateResetPassword, authController.resetPassword);
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

module.exports = router;

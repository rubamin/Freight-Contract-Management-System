const express = require("express");
const authController = require("../controllers/authController");
const { validateLogin } = require("../validators/authValidator");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", validateLogin, authController.login);
router.get("/me", authMiddleware, authController.me);


module.exports = router;

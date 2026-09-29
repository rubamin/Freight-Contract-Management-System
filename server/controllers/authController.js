const authService = require("../services/authService");
const {
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} = require("../constants/messages");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const buildResetLink = (rawToken) =>
  `${CLIENT_URL}/reset-password?token=${rawToken}`;

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.UserID);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body, { buildResetLink });

    return res.status(200).json({
      success: true,
      message: PASSWORD_RESET_REQUEST_MESSAGE,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body);

    return res.status(200).json({
      success: true,
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  login,
  me,
  forgotPassword,
  resetPassword,
};
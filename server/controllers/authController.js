const authService = require("../services/authService");
const {
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} = require("../constants/messages");

const auditContext = (req) => ({ ip: req.ip });

const sendError = (res, error, fallbackStatus) => {
  const status = error.status || fallbackStatus;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? "Something went wrong. Please try again later." : error.message,
  });
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body, auditContext(req));

    return res.status(200).json({
      success: true,
      message: result.user.MustChangePassword ? "Please set a new password to continue." : "Login successful.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.UserID);

    return res.status(200).json({
      success: true,
      data: { ...user, MustChangePassword: req.passwordChangeRequired },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// First sign-in: only callable with the limited token from login.
const setPassword = async (req, res) => {
  if (!req.passwordChangeRequired) {
    return res.status(400).json({
      success: false,
      message: "Your password is already set. Use \"Change password\" instead.",
    });
  }

  try {
    const result = await authService.setInitialPassword(req.user.UserID, req.body, auditContext(req));
    return res.status(200).json({ success: true, message: "Your new password is set.", data: result });
  } catch (error) {
    return sendError(res, error, 500);
  }
};

// Same reply whether or not the email exists (no account discovery).
const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body, auditContext(req));

  return res.status(200).json({
    success: true,
    message: PASSWORD_RESET_REQUEST_MESSAGE,
  });
};

const resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body, auditContext(req));

    return res.status(200).json({
      success: true,
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
};

module.exports = {
  login,
  me,
  setPassword,
  forgotPassword,
  resetPassword,
};

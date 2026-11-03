const { sequelize, User, Role } = require("../models");
const { comparePassword } = require("../helpers/bcrpt");
const { sanitizeUser } = require("../utils/userSanitizer");
const { HttpError } = require("../utils/httpError");
const { buildSession } = require("./session.service");
const { recordAuthEvent } = require("./authAudit.service");
const { assertNewPasswordAllowed, replacePassword } = require("./password.service");
const { canIssueOtp, issueOtp, checkOtp, markOtpUsed } = require("./otp.service");
const { sendPasswordOtpEmail, sendPasswordChangedEmail } = require("./authMail.service");
const { AUTH_AUDIT_ACTIONS } = require("../constants/password");
const { PASSWORD_RESET_INVALID_CODE_MESSAGE } = require("../constants/messages");

const WITH_ROLE = [{ model: Role, as: "role" }];

const findActiveUserByEmail = (Email) =>
  User.findOne({ where: { Email, IsActive: true }, include: WITH_ROLE });

// The "password changed" notice is informational: a failure is only logged.
const notifyPasswordChanged = async (user) => {
  try {
    await sendPasswordChangedEmail({ name: user.FullName, email: user.Email });
  } catch (error) {
    console.error("Failed to send the password-changed notice:", error.message);
  }
};

// Saves a password the user chose themselves (no forced change after),
// audits it and sends the notice. `extraWork(transaction)` runs first in
// the same transaction.
const saveOwnPassword = async (user, newPassword, { ip, actionType, extraWork }) => {
  await sequelize.transaction(async (transaction) => {
    if (extraWork) await extraWork(transaction);
    await replacePassword(user, newPassword, { mustChange: false, transaction });
  });
  await recordAuthEvent({ ip, actorId: user.UserID, userId: user.UserID, actionType });
  await notifyPasswordChanged(user);
  return user;
};

// A user who must set a new password first gets the limited 30-minute
// token (user.MustChangePassword = true).
const login = async ({ Email, Password }, { ip }) => {
  const user = await findActiveUserByEmail(Email);
  const isValidPassword = user?.PasswordHash ? await comparePassword(Password, user.PasswordHash) : false;

  if (!isValidPassword) {
    if (user) {
      await recordAuthEvent({ ip, actorId: user.UserID, userId: user.UserID, actionType: AUTH_AUDIT_ACTIONS.LOGIN_FAILED });
    }
    throw new HttpError(401, "Invalid email or password.");
  }

  // Use sequelize.literal('GETDATE()') for SQL Server to prevent string-to-datetime conversion errors
  await user.update({
    LastLogin: sequelize.literal("GETDATE()"),
  });
  await recordAuthEvent({
    ip,
    actorId: user.UserID,
    userId: user.UserID,
    actionType: AUTH_AUDIT_ACTIONS.LOGIN,
    newData: user.MustChangePassword ? { mustChangePassword: true } : null,
  });

  return buildSession(user);
};

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, { include: WITH_ROLE });

  if (!user) {
    throw new Error("User not found.");
  }

  return sanitizeUser(user);
};

// First sign-in (new account or after an admin reset).
const setInitialPassword = async (userId, { newPassword }, { ip }) => {
  const user = await User.findByPk(userId, { include: WITH_ROLE });
  await assertNewPasswordAllowed(user, newPassword);
  await saveOwnPassword(user, newPassword, { ip, actionType: AUTH_AUDIT_ACTIONS.PASSWORD_SET_FIRST_LOGIN });
  return buildSession(user);
};

// Emails a 6-digit code when the account exists and the rate limits
// allow it. Never tells the caller which happened (no account discovery).
const forgotPassword = async ({ Email }, { ip }) => {
  try {
    const user = await findActiveUserByEmail(Email);
    if (!user || !(await canIssueOtp(user.UserID))) return;

    await sequelize.transaction(async (transaction) => {
      const code = await issueOtp(user.UserID, transaction);
      await sendPasswordOtpEmail({ name: user.FullName, email: user.Email, code });
    });
    await recordAuthEvent({ ip, actorId: user.UserID, userId: user.UserID, actionType: AUTH_AUDIT_ACTIONS.PASSWORD_OTP_SENT });
  } catch (error) {
    console.error("Failed to process forgot-password request:", error.message);
  }
};

const resetPassword = async ({ Email, otp, newPassword }, { ip }) => {
  const user = await findActiveUserByEmail(Email);
  if (!user) {
    throw new HttpError(400, PASSWORD_RESET_INVALID_CODE_MESSAGE);
  }

  const otpCheck = await checkOtp(user.UserID, otp);
  if (otpCheck.error) {
    throw new HttpError(400, otpCheck.error);
  }

  await assertNewPasswordAllowed(user, newPassword);
  await saveOwnPassword(user, newPassword, {
    ip,
    actionType: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_BY_OTP,
    extraWork: async (transaction) => {
      if (!(await markOtpUsed(otpCheck.otpId, transaction))) {
        throw new HttpError(400, PASSWORD_RESET_INVALID_CODE_MESSAGE);
      }
    },
  });
};

module.exports = {
  login,
  getProfile,
  setInitialPassword,
  forgotPassword,
  resetPassword,
  saveOwnPassword,
};

const { sequelize, User, Role } = require("../models");
const { comparePassword } = require("../helpers/bcrpt");
const { sanitizeUser } = require("../utils/userSanitizer");
const { HttpError } = require("../utils/httpError");
const { buildSession } = require("./session.service");
const { recordAuthEvent } = require("./authAudit.service");
const { assertNewPasswordAllowed, replacePassword } = require("./password.service");
const { canIssueOtp, issueOtp, checkOtp, markOtpUsed } = require("./otp.service");
const { sendPasswordOtpEmail, sendPasswordChangedEmail } = require("./authMail.service");
const { recordFailedLogin, lockMinutesLeft, alertAccountLockedInBackground } = require("./loginLockout.service");
const { isPasswordExpired, needsPasswordChange } = require("../helpers/password");
const { AUTH_AUDIT_ACTIONS, MAX_FAILED_LOGINS, LOCKOUT_MINUTES } = require("../constants/password");
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

const LOCKED_STATUS = 423;
const INVALID_LOGIN_MESSAGE = "Invalid email or password.";

const lockedMessage = (minutes) =>
  `Your account is locked after ${MAX_FAILED_LOGINS} wrong passwords. ` +
  `Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or contact the IT department to reset your password straight away.`;

const failedLoginMessage = (attemptsLeft) =>
  attemptsLeft === 1
    ? `${INVALID_LOGIN_MESSAGE} One more wrong password will lock your account for ${LOCKOUT_MINUTES} minutes.`
    : INVALID_LOGIN_MESSAGE;

// Counts the wrong password and throws the reply. The attempt that locks
// the account alerts the admins in the background.
const rejectWrongPassword = async (user, { ip }) => {
  await recordAuthEvent({ ip, actorId: user.UserID, userId: user.UserID, actionType: AUTH_AUDIT_ACTIONS.LOGIN_FAILED });
  const { locked, attemptsLeft, lockedUntilText } = await recordFailedLogin(user.UserID);
  if (locked) {
    alertAccountLockedInBackground(user, { ip, lockedUntilText });
    throw new HttpError(LOCKED_STATUS, lockedMessage(LOCKOUT_MINUTES));
  }
  throw new HttpError(401, failedLoginMessage(attemptsLeft));
};

// A locked account is refused even with the right password. A user who
// must set a new password first (temporary or expired password) gets the
// limited 30-minute token.
const login = async ({ Email, Password }, { ip }) => {
  const user = await findActiveUserByEmail(Email);
  if (!user) throw new HttpError(401, INVALID_LOGIN_MESSAGE);

  const minutesLeft = await lockMinutesLeft(user.UserID);
  if (minutesLeft > 0) throw new HttpError(LOCKED_STATUS, lockedMessage(minutesLeft));

  const isValidPassword = user.PasswordHash ? await comparePassword(Password, user.PasswordHash) : false;
  if (!isValidPassword) await rejectWrongPassword(user, { ip });

  // Use sequelize.literal('GETDATE()') for SQL Server to prevent string-to-datetime conversion errors
  await user.update({
    LastLogin: sequelize.literal("GETDATE()"),
    FailedLoginCount: 0,
    LockedUntil: null,
  });
  const mustChangePassword = needsPasswordChange(user);
  await recordAuthEvent({
    ip,
    actorId: user.UserID,
    userId: user.UserID,
    actionType: AUTH_AUDIT_ACTIONS.LOGIN,
    newData: mustChangePassword ? { mustChangePassword: true, passwordExpired: isPasswordExpired(user) } : null,
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

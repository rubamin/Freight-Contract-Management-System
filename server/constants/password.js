// Settings for the secure login flow: password rules, temporary
// passwords, forgot-password codes and sign-in sessions. The client
// mirrors the password rules in client/src/utils/passwordRules.js.

const PASSWORD_MIN_LENGTH = 11;
const PASSWORD_HISTORY_DEPTH = 3;

// Name parts / email IDs shorter than this are too common to block.
const MIN_IDENTITY_TOKEN_LENGTH = 3;

// Temporary passwords leave out look-alike characters (0/O/o, 1/l/I).
const TEMP_PASSWORD_LENGTH = 14;
const TEMP_PASSWORD_SETS = Object.freeze({
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnpqrstuvwxyz",
  digits: "23456789",
  special: "@#$%&*!?-+=",
});

const OTP_LENGTH = 6;
const OTP_VALID_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MIN_INTERVAL_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;
const OTP_PURPOSE = Object.freeze({ FORGOT_PASSWORD: "FORGOT_PASSWORD" });

// Bumped whenever the session token shape changes: older tokens are
// rejected once and the user simply signs in again.
const SESSION_TOKEN_VERSION = 2;
const PASSWORD_CHANGE_TOKEN_SCOPE = "password-change";
const PASSWORD_CHANGE_TOKEN_EXPIRY = "30m";

const AUTH_ERROR_CODES = Object.freeze({
  PASSWORD_CHANGE_REQUIRED: "PASSWORD_CHANGE_REQUIRED",
  SESSION_ENDED: "SESSION_ENDED",
});

// AuditLogs.ActionType values (max 20 characters) for sign-in and
// password events. TableName is always "Users".
const AUTH_AUDIT_ACTIONS = Object.freeze({
  LOGIN: "LOGIN",
  LOGIN_FAILED: "LOGIN_FAILED",
  PASSWORD_SET_FIRST_LOGIN: "PWD_SET_FIRST_LOGIN",
  PASSWORD_CHANGED: "PWD_CHANGED",
  PASSWORD_OTP_SENT: "PWD_OTP_SENT",
  PASSWORD_RESET_BY_OTP: "PWD_RESET_BY_OTP",
  PASSWORD_RESET_BY_ADMIN: "PWD_RESET_BY_ADMIN",
  PASSWORD_SET_BY_SCRIPT: "PWD_SET_BY_SCRIPT",
  USER_CREATED: "USER_CREATED",
});

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_HISTORY_DEPTH,
  MIN_IDENTITY_TOKEN_LENGTH,
  TEMP_PASSWORD_LENGTH,
  TEMP_PASSWORD_SETS,
  OTP_LENGTH,
  OTP_VALID_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MIN_INTERVAL_SECONDS,
  OTP_MAX_PER_HOUR,
  OTP_PURPOSE,
  SESSION_TOKEN_VERSION,
  PASSWORD_CHANGE_TOKEN_SCOPE,
  PASSWORD_CHANGE_TOKEN_EXPIRY,
  AUTH_ERROR_CODES,
  AUTH_AUDIT_ACTIONS,
};

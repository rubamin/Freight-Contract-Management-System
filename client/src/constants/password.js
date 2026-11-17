// Password, code and session settings for the sign-in screens. Mirrors
// server/constants/password.js; the server always makes the final decision.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 15;
export const PASSWORD_HISTORY_DEPTH = 3;
export const MIN_IDENTITY_TOKEN_LENGTH = 3;
// Whole words a password must not contain; part of one is allowed.
export const PASSWORD_BLOCKED_WORDS = ["rubamin"];
export const PASSWORD_EXPIRY_DAYS = 90;

export const OTP_LENGTH = 6;
export const RESEND_WAIT_SECONDS = 60;

export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";

// Calls that send an email wait for the SMTP server, which can take
// longer than the default axios timeout.
export const EMAIL_REQUEST_TIMEOUT_MS = 90000;

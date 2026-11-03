// Password, code and session settings for the sign-in screens. Mirrors
// server/constants/password.js; the server always makes the final decision.

export const PASSWORD_MIN_LENGTH = 11;
export const PASSWORD_HISTORY_DEPTH = 3;
export const MIN_IDENTITY_TOKEN_LENGTH = 3;

export const OTP_LENGTH = 6;
export const RESEND_WAIT_SECONDS = 60;

export const PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";

// Calls that send an email wait for the SMTP server, which can take
// longer than the default axios timeout.
export const EMAIL_REQUEST_TIMEOUT_MS = 90000;

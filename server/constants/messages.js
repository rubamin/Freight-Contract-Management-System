// Centralized user-facing message strings shared across controllers.
// Keeping these here avoids duplicating the same hardcoded strings in
// multiple controllers and makes wording easy to update in one place.

const INVALID_PLANT_LOCATION_MESSAGE =
  "Selected plant/location is invalid, please re-select.";

const PASSWORD_RESET_REQUEST_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

const PASSWORD_RESET_INVALID_TOKEN_MESSAGE =
  "This password reset link is invalid or has expired. Please request a new one.";

const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Your password has been reset successfully. You can now log in.";

module.exports = {
  INVALID_PLANT_LOCATION_MESSAGE,
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
};

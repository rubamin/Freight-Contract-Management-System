// Centralized user-facing message strings shared across controllers.
// Keeping these here avoids duplicating the same hardcoded strings in
// multiple controllers and makes wording easy to update in one place.

const INVALID_PLANT_LOCATION_MESSAGE =
  "Selected plant/location is invalid, please re-select.";

const PASSWORD_RESET_REQUEST_MESSAGE =
  "If an account exists for that email, a 6-digit code has been sent to it.";

const PASSWORD_RESET_INVALID_CODE_MESSAGE =
  "The code is invalid or has expired. Request a new code.";

const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Your password has been reset. Sign in with your new password.";

module.exports = {
  INVALID_PLANT_LOCATION_MESSAGE,
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_INVALID_CODE_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
};

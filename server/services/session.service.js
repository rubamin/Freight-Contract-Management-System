// Sign-in sessions. A token carries a version (`ver`, older tokens are
// rejected once) and the user's PasswordChangedAt (`pwdAt`), so a
// password change or an admin reset ends every older session. A user who
// must set a new password first gets a limited, short-lived token that
// only opens the password routes (see middleware/authMiddleware.js).
const { generateToken } = require("../helpers/jwt");
const { sanitizeUser } = require("../utils/userSanitizer");
const {
  SESSION_TOKEN_VERSION,
  PASSWORD_CHANGE_TOKEN_SCOPE,
  PASSWORD_CHANGE_TOKEN_EXPIRY,
} = require("../constants/password");

const passwordStamp = (passwordChangedAt) => (passwordChangedAt ? new Date(passwordChangedAt).getTime() : 0);

const issueSessionToken = (user) => {
  const payload = {
    UserID: user.UserID,
    RoleID: user.RoleID,
    Email: user.Email,
    ver: SESSION_TOKEN_VERSION,
    pwdAt: passwordStamp(user.PasswordChangedAt),
  };
  return user.MustChangePassword
    ? generateToken({ ...payload, scope: PASSWORD_CHANGE_TOKEN_SCOPE }, PASSWORD_CHANGE_TOKEN_EXPIRY)
    : generateToken(payload);
};

// The { token, user } pair every sign-in / password response returns.
const buildSession = (user) => ({
  token: issueSessionToken(user),
  user: sanitizeUser(user),
});

module.exports = { passwordStamp, buildSession };

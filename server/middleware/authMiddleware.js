const { verifyToken } = require("../helpers/jwt");
const { User, Role } = require("../models");
const { passwordStamp } = require("../services/session.service");
const {
  SESSION_TOKEN_VERSION,
  PASSWORD_CHANGE_TOKEN_SCOPE,
  AUTH_ERROR_CODES,
} = require("../constants/password");

const reject = (res, status, message, code) =>
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

// Sends the error reply; returns null so loadSession can `return fail(...)`.
const fail = (res, status, message, code) => {
  reject(res, status, message, code);
  return null;
};

const decodeBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return { missing: true };
  try {
    return { decoded: verifyToken(authHeader.split(" ")[1]) };
  } catch (error) {
    return { invalid: true };
  }
};

// Checks the token against the user as they are now. Sends the error
// reply itself and returns null when the session is not valid.
const loadSession = async (req, res) => {
  const { missing, invalid, decoded } = decodeBearerToken(req);
  if (missing) return fail(res, 401, "Authorization token is required.");
  if (invalid) return fail(res, 401, "Invalid or expired token.");

  if (decoded.ver !== SESSION_TOKEN_VERSION) {
    return fail(res, 401, "Please sign in again.", AUTH_ERROR_CODES.SESSION_ENDED);
  }
  const isPasswordChangeToken = decoded.scope === PASSWORD_CHANGE_TOKEN_SCOPE;
  if (decoded.scope && !isPasswordChangeToken) {
    return fail(res, 403, "This token is not valid for this resource.");
  }

  const user = await User.findByPk(decoded.UserID, {
    include: [{ model: Role, as: "role", attributes: ["RoleName"] }],
  });
  if (!user || !user.IsActive) {
    return fail(res, 401, "Invalid or inactive user.", AUTH_ERROR_CODES.SESSION_ENDED);
  }
  if (passwordStamp(user.PasswordChangedAt) !== decoded.pwdAt) {
    return fail(res, 401, "Your password was changed. Please sign in again.", AUTH_ERROR_CODES.SESSION_ENDED);
  }

  return { user, passwordChangeRequired: isPasswordChangeToken || Boolean(user.MustChangePassword) };
};

// `allowPasswordChange` lets in a user who must set a new password first
// (password routes and /auth/me only); everywhere else they get 403
// PASSWORD_CHANGE_REQUIRED.
const buildAuthMiddleware = (allowPasswordChange) => async (req, res, next) => {
  let session;
  try {
    session = await loadSession(req, res);
  } catch (error) {
    console.error("Session check failed:", error);
    return reject(res, 500, "Server error while checking your session.");
  }
  if (!session) return undefined;

  if (session.passwordChangeRequired && !allowPasswordChange) {
    return reject(res, 403, "You must set a new password before continuing.", AUTH_ERROR_CODES.PASSWORD_CHANGE_REQUIRED);
  }

  const { user } = session;
  req.user = {
    UserID: user.UserID,
    RoleID: user.RoleID,
    RoleName: user.role?.RoleName || null,
    Email: user.Email,
    FullName: user.FullName,
  };
  req.passwordChangeRequired = session.passwordChangeRequired;
  return next();
};

const authMiddleware = buildAuthMiddleware(false);

module.exports = authMiddleware;
module.exports.passwordRouteAuth = buildAuthMiddleware(true);

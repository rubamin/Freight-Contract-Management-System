const crypto = require("crypto");

// How long a password reset link stays valid after being requested.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Generates a random token to email to the user, plus a SHA-256 hash of it
// to store in the database. Only the hash is ever persisted, so a leaked
// database can't be used to forge valid reset links.
const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  return { rawToken, tokenHash, expiresAt };
};

const hashResetToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");

module.exports = {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
};

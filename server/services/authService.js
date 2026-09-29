const { User, Role, sequelize } = require("../models");
const { comparePassword, hashPassword } = require("../helpers/bcrpt");
const { generateToken } = require("../helpers/jwt");
const { sanitizeUser } = require("../utils/userSanitizer");
const { generateResetToken, hashResetToken } = require("../helpers/passwordReset");
const { sendPasswordResetEmail } = require("./mailer.service");
const {
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
} = require("../constants/messages");

const login = async ({ Email, Password }) => {
  const user = await User.findOne({
    where: {
      Email,
      IsActive: true,
    },
    include: [
      {
        model: Role,
        as: "role",
      },
    ],
  });

  if (!user || !user.PasswordHash) {
    throw new Error("Invalid email or password.");
  }

  const isValidPassword = await comparePassword(
    Password,
    user.PasswordHash
  );

  if (!isValidPassword) {
    throw new Error("Invalid email or password.");
  }

  // Use sequelize.literal('GETDATE()') for SQL Server to prevent string-to-datetime conversion errors
  await user.update({
    LastLogin: sequelize.literal("GETDATE()"),
  });

  const token = generateToken({
    UserID: user.UserID,
    RoleID: user.RoleID,
    Email: user.Email,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
};

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: "role",
      },
    ],
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return sanitizeUser(user);
};

const forgotPassword = async ({ Email }, { buildResetLink }) => {
  const user = await User.findOne({
    where: {
      Email,
      IsActive: true,
    },
  });

  if (!user) {
    return;
  }

  const { rawToken, tokenHash, expiresAt } = generateResetToken();

  await user.update({
    PasswordResetTokenHash: tokenHash,
    PasswordResetExpiresAt: expiresAt,
  });

  const resetLink = buildResetLink(rawToken);

  try {
    await sendPasswordResetEmail(user.Email, resetLink);
  } catch (error) {
    console.error("Failed to send password reset email:", error.message);
    throw new Error("Unable to send the password reset email.");
  }
};

const resetPassword = async ({ token, newPassword }) => {
  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    where: {
      PasswordResetTokenHash: tokenHash,
    },
  });

  if (
    !user ||
    !user.PasswordResetExpiresAt ||
    new Date(user.PasswordResetExpiresAt).getTime() < Date.now()
  ) {
    throw new Error(PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
  }

  const passwordHash = await hashPassword(newPassword);

  await user.update({
    PasswordHash: passwordHash,
    PasswordResetTokenHash: null,
    PasswordResetExpiresAt: null,
  });
};

module.exports = {
  login,
  getProfile,
  forgotPassword,
  resetPassword,
};
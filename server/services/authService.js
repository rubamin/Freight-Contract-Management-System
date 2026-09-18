<<<<<<< HEAD
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
=======
const { User, Role } = require("../models");
const { comparePassword } = require("../helpers/bcrpt");
const { generateToken } = require("../helpers/jwt");

const sanitizeUser = (user) => ({
  UserID: user.UserID,
  RoleID: user.RoleID,
  FullName: user.FullName,
  Email: user.Email,
  MobileNo: user.MobileNo,
  IsActive: user.IsActive,
  LastLogin: user.LastLogin,
  role: user.role,
});

const login = async ({ Email, Password }) => {
  console.log("========== LOGIN ==========");
  console.log("Email :", Email);
  console.log("Password :", Password);

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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

<<<<<<< HEAD
  if (!user || !user.PasswordHash) {
=======
  console.log("User Found :", !!user);

  if (user) {
    console.log("DB Email :", user.Email);
    console.log("DB Hash :", user.PasswordHash);
  }

  if (!user || !user.PasswordHash) {
    console.log("❌ User not found or PasswordHash missing");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    throw new Error("Invalid email or password.");
  }

  const isValidPassword = await comparePassword(
    Password,
    user.PasswordHash
  );

<<<<<<< HEAD
  if (!isValidPassword) {
    throw new Error("Invalid email or password.");
  }

  // Use sequelize.literal('GETDATE()') for SQL Server to prevent string-to-datetime conversion errors
  await user.update({
    LastLogin: sequelize.literal("GETDATE()"),
  });

=======
  console.log("Password Match :", isValidPassword);

  if (!isValidPassword) {
    console.log("❌ Password mismatch");
    throw new Error("Invalid email or password.");
  }

  // await user.update({
  //   LastLogin: new Date(),
  // });
console.log("Skipping LastLogin update...");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const token = generateToken({
    UserID: user.UserID,
    RoleID: user.RoleID,
    Email: user.Email,
  });

<<<<<<< HEAD
=======
  console.log("✅ Login Successful");

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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

<<<<<<< HEAD
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
=======
module.exports = {
  login,
  getProfile,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
};
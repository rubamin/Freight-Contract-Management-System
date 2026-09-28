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

  console.log("User Found :", !!user);

  if (user) {
    console.log("DB Email :", user.Email);
    console.log("DB Hash :", user.PasswordHash);
  }

  if (!user || !user.PasswordHash) {
    console.log("❌ User not found or PasswordHash missing");

    throw new Error("Invalid email or password.");
  }

  const isValidPassword = await comparePassword(
    Password,
    user.PasswordHash
  );

  console.log("Password Match :", isValidPassword);

  if (!isValidPassword) {
    console.log("❌ Password mismatch");
    throw new Error("Invalid email or password.");
  }

  // await user.update({
  //   LastLogin: new Date(),
  // });
console.log("Skipping LastLogin update...");

  const token = generateToken({
    UserID: user.UserID,
    RoleID: user.RoleID,
    Email: user.Email,
  });

  console.log("✅ Login Successful");


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

module.exports = {
  login,
  getProfile,

};
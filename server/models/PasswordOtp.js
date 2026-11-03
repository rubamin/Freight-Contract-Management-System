const { DataTypes, literal } = require("sequelize");
const sequelize = require("../config/database");

// Forgot-password codes. Only the bcrypt hash of the code is stored.
// Dates come from SQL Server (GETDATE()), so expiry and rate limits are
// compared in SQL against the same clock.
const PasswordOtp = sequelize.define(
  "PasswordOtp",
  {
    PasswordOtpID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Purpose: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    OtpHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ExpiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    Attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    UsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
  },
  {
    tableName: "PasswordOtps",
    timestamps: false,
  }
);

module.exports = PasswordOtp;

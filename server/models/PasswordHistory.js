const { DataTypes, literal } = require("sequelize");
const sequelize = require("../config/database");

// bcrypt hashes of a user's replaced passwords, so a recent password
// can't be reused. Only the newest PASSWORD_HISTORY_DEPTH are kept.
// Dates come from SQL Server (GETDATE()), like every other table here.
const PasswordHistory = sequelize.define(
  "PasswordHistory",
  {
    PasswordHistoryID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    PasswordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    tableName: "PasswordHistories",
    timestamps: false,
  }
);

module.exports = PasswordHistory;

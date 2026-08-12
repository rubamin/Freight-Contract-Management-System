const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    UserID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    RoleID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    FullName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    Email: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Invalid email address",
        },
      },
    },

    PasswordHash: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    MobileNo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    LastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "Users",
    timestamps: false,
  }
);

module.exports = User;
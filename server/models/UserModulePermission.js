const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Per-user, per-master View/Add/Edit permission (task item 4). One row per
// (UserID, ModuleKey) pair; ModuleKey matches the keys used in
// server/constants/modules.js (e.g. "vendors", "contracts", "users").
const UserModulePermission = sequelize.define(
  "UserModulePermission",
  {
    UserModulePermissionID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ModuleKey: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    CanView: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    CanAdd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    CanEdit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "UserModulePermission",
    timestamps: false,
  }
);

module.exports = UserModulePermission;

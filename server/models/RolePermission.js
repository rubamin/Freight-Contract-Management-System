const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RolePermission = sequelize.define(
  "RolePermission",
  {
    RolePermissionID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    RoleID: {
      type: DataTypes.INTEGER,
    },
    PermissionID: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "RolePermissions",
    timestamps: false,
  }
);

module.exports = RolePermission;

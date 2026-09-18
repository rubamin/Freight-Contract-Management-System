const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Which plants/locations a user is allowed to access (task item 4's
// "Settings & Hierarchy permissions" and task item 5's Default
// Plant/Location list). One row per (UserID, PlantID) pair.
const UserLocationPermission = sequelize.define(
  "UserLocationPermission",
  {
    UserLocationPermissionID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    PlantID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    CanView: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: "UserLocationPermission",
    timestamps: false,
  }
);

module.exports = UserLocationPermission;

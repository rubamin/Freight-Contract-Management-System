const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// A user may receive access to a legacy Plants record or directly to a
// Settings & Hierarchy location.
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
      allowNull: true,
    },
    LocationID: {
      type: DataTypes.INTEGER,
      allowNull: true,
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

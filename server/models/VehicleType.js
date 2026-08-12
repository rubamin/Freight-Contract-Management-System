const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VehicleType = sequelize.define(
  "VehicleType",
  {
    VehicleTypeID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    VehicleName: {
      type: DataTypes.STRING(100),
      unique: true,
    },
    Capacity: {
      type: DataTypes.DECIMAL(18, 2),
    },
    Unit: {
      type: DataTypes.STRING(20),
    },
  },
  {
    tableName: "VehicleTypes",
    timestamps: false,
  }
);

module.exports = VehicleType;

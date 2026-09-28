const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ContractRateMatrix = sequelize.define(
  "ContractRateMatrix",
  {
    RateID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ContractID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    DestinationID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    VehicleTypeID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    WeightID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    BaseRate: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    EffectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    EffectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "ContractRateMatrix",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["ContractID", "DestinationID", "VehicleTypeID", "WeightID"],
      },
    ],
  }
);

module.exports = ContractRateMatrix;
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
    // Distance from the "DISTANCE IN KM" column of the Rate Matrix template
    // (added to the table by migration_v7 / migration_v9).
    DistanceKM: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    // Four decimals so per-KG rates (e.g. 2.0430) are kept exactly
    // (migration_v11).
    BaseRate: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
    },
    // FTL Inbound rows only: where the pick-up is delivered and the round
    // trip transit time in days (migration_v11).
    DeliveryLocation: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    TransitDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
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
    // Distance in KM for this destination, parsed from the "KM" column in
    // the DOMESTIC DESTINATIONS sheet of the Rate Matrix Excel template.
    // Nullable because rows from the ADDITIONAL DESTINATIONS sheet (by
    // vehicle type) and manually-added destinations don't carry a KM value.
    // Requires database/migration_v7.sql to have been run - the column
    // does not exist on ContractRateMatrix until that migration is applied.
    DistanceKM: {
      type: DataTypes.DECIMAL(18, 2),
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
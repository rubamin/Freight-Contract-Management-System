const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Part Load freight per zone and weight band, imported from the
// ZONE RATES template sheet (migration_v11). Coverage lists the cities or
// states of the zone separated by "/".
const ContractZoneRate = sequelize.define(
  "ContractZoneRate",
  {
    ZoneRateID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ContractID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ZoneCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Coverage: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    WeightFromKG: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    WeightToKG: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    RatePerKG: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
    },
  },
  {
    tableName: "ContractZoneRates",
    timestamps: false,
  }
);

module.exports = ContractZoneRate;

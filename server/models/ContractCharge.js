const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Contract-level charges imported from the CHARGES / DOCKET SLABS /
// ODA MATRIX template sheets (migration_v11). ChargeCode values come from
// constants/contractTypes.js CHARGE_CODES.
const ContractCharge = sequelize.define(
  "ContractCharge",
  {
    ChargeID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ContractID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ChargeCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    // ODA distance category (A / B / C / D) for ODA rows.
    Category: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    WeightFromKG: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    WeightToKG: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    Amount: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
    },
    Remarks: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "ContractCharges",
    timestamps: false,
  }
);

module.exports = ContractCharge;

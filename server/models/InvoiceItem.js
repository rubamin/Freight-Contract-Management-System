const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const InvoiceItem = sequelize.define(
  "InvoiceItem",
  {
    InvoiceItemID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    InvoiceID: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    DestinationID: DataTypes.INTEGER,
    WeightID: DataTypes.INTEGER,
    ActualWeight: DataTypes.DECIMAL(18, 2),
    DistanceKM: DataTypes.DECIMAL(18, 2),
    Rate: DataTypes.DECIMAL(18, 2),
    FreightAmount: DataTypes.DECIMAL(18, 2),
  },
  {
    tableName: "InvoiceItems",
    timestamps: false,
  }
);

module.exports = InvoiceItem;

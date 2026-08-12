const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VendorGST = sequelize.define(
  "VendorGST",
  {
    VendorGSTID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    VendorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    GSTNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    StateName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    IsDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "VendorGST",
    timestamps: false,
  }
);

module.exports = VendorGST;
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ContractMaster = sequelize.define(
  "ContractMaster",
  {
    ContractID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ContractNo: {
      type: DataTypes.STRING(100),
      unique: true,

      allowNull: false,
    },
    VendorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    VendorPAN: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ContractStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    ContractEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    DieselBasePrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    DieselRevision: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(30), 
      allowNull: true,
    },
    Remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    RateMatrixFileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    CreatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    UpdatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      field: "CreatedAt", // Explicitly links it to the exact DB column spelling
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      field: "UpdatedAt", // Explicitly links it to the exact DB column spelling
    },
  },
  {
    tableName: "ContractMaster",
    timestamps: true, // Turn this on so Sequelize correctly expects and handles these two dates
    createdAt: "CreatedAt", // Maps native Sequelize timestamp hooks to your exact uppercase column
    updatedAt: "UpdatedAt",
    underscored: false,

  }
);

module.exports = ContractMaster;
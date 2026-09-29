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
      // Bug fix (task item 4): this used to be `unique: true` on its own,
      // making ContractNo globally unique across every vendor - so two
      // different vendors could never both have a Contract No. "01". The
      // real uniqueness rule is composite (VendorID, ContractNo); see the
      // `indexes` option below and migration_v2.sql step 13 for the
      // matching DB-level unique index.
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
    indexes: [
      {
        // Composite uniqueness (task item 4): ContractNo only needs to be
        // unique per vendor, not globally.
        unique: true,
        fields: ["VendorID", "ContractNo"],
        name: "UQ_ContractMaster_Vendor_ContractNo",
      },
    ],
  }
);

module.exports = ContractMaster;
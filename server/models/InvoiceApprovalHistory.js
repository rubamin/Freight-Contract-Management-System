const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const InvoiceApprovalHistory = sequelize.define(
  "InvoiceApprovalHistory",
  {
    ApprovalID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    InvoiceID: DataTypes.BIGINT,
    ApprovedBy: DataTypes.INTEGER,
    StatusID: DataTypes.INTEGER,
    Remarks: DataTypes.TEXT,
    ApprovedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "InvoiceApprovalHistory",
    timestamps: false,
  }
);

module.exports = InvoiceApprovalHistory;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

const InvoiceApprovalHistory = sequelize.define(
  "InvoiceApprovalHistory",
  {
    ApprovalID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    InvoiceID: DataTypes.BIGINT,
    // Status the invoice was in immediately before this approval action.
    // Merged in from the never-created "InvoiceStatusHistory" table (see
    // migration_v2.sql step 8) so status transitions are recorded in one
    // canonical table instead of two overlapping ones.
    OldStatusID: DataTypes.INTEGER,
    ApprovedBy: DataTypes.INTEGER,
    // Status the invoice moved to as a result of this approval action
    // (doubles as "NewStatusID" from the merged table).
    StatusID: DataTypes.INTEGER,
    Remarks: DataTypes.TEXT,
    ApprovedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
  },
  {
    tableName: "InvoiceApprovalHistory",
    timestamps: false,
  }
);

module.exports = InvoiceApprovalHistory;

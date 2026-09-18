const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
<<<<<<< HEAD
const { literal } = require("sequelize");
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

const InvoiceApprovalHistory = sequelize.define(
  "InvoiceApprovalHistory",
  {
    ApprovalID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    InvoiceID: DataTypes.BIGINT,
<<<<<<< HEAD
    // Status the invoice was in immediately before this approval action.
    // Merged in from the never-created "InvoiceStatusHistory" table (see
    // migration_v2.sql step 8) so status transitions are recorded in one
    // canonical table instead of two overlapping ones.
    OldStatusID: DataTypes.INTEGER,
    ApprovedBy: DataTypes.INTEGER,
    // Status the invoice moved to as a result of this approval action
    // (doubles as "NewStatusID" from the merged table).
=======
    ApprovedBy: DataTypes.INTEGER,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    StatusID: DataTypes.INTEGER,
    Remarks: DataTypes.TEXT,
    ApprovedDate: {
      type: DataTypes.DATE,
<<<<<<< HEAD
      defaultValue: literal("GETDATE()"),
=======
      defaultValue: DataTypes.NOW,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    },
  },
  {
    tableName: "InvoiceApprovalHistory",
    timestamps: false,
  }
);

module.exports = InvoiceApprovalHistory;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");
const { MAX_DRAFT_TITLE_LENGTH, DRAFT_TYPES } = require("../constants/invoiceDrafts");

// A saved Add Invoice page (or one invoice removed from it), or unsaved
// changes of existing invoices from the Edit Invoice page. Payload is the
// page state as JSON; Files maps each attachment key to the file kept
// under draft_uploads/<DraftID>.
const InvoiceDraft = sequelize.define(
  "InvoiceDraft",
  {
    DraftID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Title: {
      type: DataTypes.STRING(MAX_DRAFT_TITLE_LENGTH),
      allowNull: true,
    },
    ContractType: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    DraftType: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: DRAFT_TYPES.ADD,
    },
    LastEditedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    InvoiceCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    Payload: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    Files: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: literal("GETDATE()"),
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "InvoiceDrafts",
    timestamps: false,
  }
);

module.exports = InvoiceDraft;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

// Customer Master: source of truth for the Customer Name dropdown on
// Add Invoice (task item 6). Previously invoices only had a free-text
// CustomerName column with no backing master table, so customer names
// could never be reused/validated across invoices.
const CustomerMaster = sequelize.define(
  "CustomerMaster",
  {
    CustomerID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    CustomerName: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    ContactPerson: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    Email: {
      type: DataTypes.STRING(200),
      allowNull: true,
      validate: {
        isEmail: {
          msg: "Invalid email address",
        },
      },
    },
    Phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    Address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // No client-side defaultValue here on purpose - see AuditLog.js for the
    // full explanation: DataTypes.NOW can be serialized by Sequelize's
    // mssql dialect as the literal text "NOW" rather than a computed
    // timestamp, which SQL Server then fails to CONVERT into a datetime
    // ("Conversion failed when converting date and/or time from character
    // string"). This field is never set from the Customer Master form, so
    // it's simply left null rather than reintroducing that bug.
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: literal("GETDATE()"),
    },
  },
  {
    tableName: "CustomerMaster",
    timestamps: false,
  }
);

module.exports = CustomerMaster;

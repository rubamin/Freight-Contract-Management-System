const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");
const { REMARK_COLUMNS } = require("./remarkColumns");
const { PARTY_TYPES, DEFAULT_PARTY_TYPE, normalizePartyType } = require("../constants/partyTypes");

// Customer / Supplier Master: source of truth for the party dropdown on
// Add / Edit Invoice. PartyType decides the list a record appears in -
// suppliers on inbound invoices, customers on outbound invoices.
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
    PartyType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: DEFAULT_PARTY_TYPE,
      validate: {
        isIn: {
          args: [Object.values(PARTY_TYPES)],
          msg: "Type must be Customer or Supplier.",
        },
      },
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
    ...REMARK_COLUMNS,
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
    hooks: {
      // Accepts "Supplier" / "supplier" from the form, bulk upload and the
      // inline add on Add Invoice; a blank type falls back to Customer, an
      // unknown one is left as typed so validation reports it.
      beforeValidate: (party) => {
        if (party.PartyType === undefined || party.PartyType === null || party.PartyType === "") {
          party.PartyType = DEFAULT_PARTY_TYPE;
          return;
        }
        party.PartyType = normalizePartyType(party.PartyType) || party.PartyType;
      },
    },
  }
);

module.exports = CustomerMaster;

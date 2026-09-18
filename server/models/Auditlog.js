const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Generic audit trail written by crud.service.js for every create/update/
// deactivate/delete action performed through the shared module CRUD layer
// (masters, workflow records, etc). This model previously did not exist as
// a file even though crud.service.js already imported and called
// `AuditLog.create(...)` on it, which crashed every Add/Edit request for
// the modules that go through that service with "Cannot read properties of
// undefined (reading 'create')".
const AuditLog = sequelize.define(
  "AuditLog",
  {
    AuditID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    TableName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    RecordID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ActionType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    OldData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    NewData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IPAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    // No client-side defaultValue here on purpose: DataTypes.NOW can be
    // serialized by Sequelize's mssql dialect as the literal text "NOW"
    // rather than a computed timestamp, which SQL Server then fails to
    // CONVERT into a datetime ("Conversion failed when converting date
    // and/or time from character string"). The AuditLogs table's own
    // DEFAULT (getdate()) constraint (see migration_v4.sql) already
    // handles this whenever the column is left unset on insert.
    ActionDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "AuditLogs",
    timestamps: false,
  }
);

module.exports = AuditLog;
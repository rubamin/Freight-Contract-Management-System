const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

// Generalized access-request flow (task item 19): a user can request
// access to any module permission (View/Add/Edit on a specific module) or
// to a specific plant/location, not just a location as the earlier,
// narrower "Request Location Access" flow supported. An admin then
// approves (which actually grants the corresponding UserModulePermission/
// UserLocationPermission row) or rejects it.
const AccessRequest = sequelize.define(
  "AccessRequest",
  {
    AccessRequestID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // "MODULE" or "LOCATION" - which of the two request shapes this is.
    RequestType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    // Populated for RequestType = "MODULE" (matches server/constants/modules.js keys).
    ModuleKey: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Populated for RequestType = "MODULE" - which action is being requested.
    RequestedAction: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    // Populated for RequestType = "LOCATION".
    PlantID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING",
    },
    RequestedAt: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
    ResolvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ResolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "AccessRequest",
    timestamps: false,
  }
);

module.exports = AccessRequest;

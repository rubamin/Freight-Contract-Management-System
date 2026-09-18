const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

// One row per user, storing personal app preferences (notifications,
// default plant/location). Distinct from ApprovalConfig, which configures
// who receives audit notification emails, not personal UI preferences.
const UserPreference = sequelize.define(
  "UserPreference",
  {
    UserID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    NotificationEmailEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    NotificationSoundEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    DefaultPlantID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // JSON-encoded array of PlantIDs, e.g. "[3,7]" (task item 5: the
    // Default Plant/Location control is a multi-select with checkboxes,
    // not a single dropdown). DefaultPlantID above is kept for backward
    // compatibility with any existing code reading a single default and
    // is kept in sync with the first entry of this list.
    DefaultPlantIDs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
  },
  {
    tableName: "UserPreferences",
    timestamps: false,
  }
);

module.exports = UserPreference;

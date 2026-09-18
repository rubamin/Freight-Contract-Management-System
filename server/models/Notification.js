const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

// A simple, shared event feed (not per-user targeted) covering the three
// event types the notification bell cares about: new invoice uploaded,
// discrepancy detected during audit, and audit email sent. Kept
// intentionally minimal — no per-user read-state table — since "unread"
// is tracked client-side against a last-seen timestamp (see
// NotificationCenter). Add per-user read tracking later only if this
// single-feed model turns out to be insufficient.
const Notification = sequelize.define(
  "Notification",
  {
    NotificationID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    Type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Message: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    RelatedInvoiceID: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      defaultValue: literal("GETDATE()"),
    },
  },
  {
    tableName: "Notifications",
    timestamps: false,
  }
);

module.exports = Notification;

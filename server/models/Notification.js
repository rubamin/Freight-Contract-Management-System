const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { literal } = require("sequelize");

// Per-user notification feed. Each row belongs to one recipient (UserID),
// so a user only ever sees their own notifications; admins can optionally
// view every user's feed. "Unread" is still tracked client-side against a
// last-seen timestamp (see useNotifications).
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
    // Recipient of this notification. Nullable only for rows created before
    // migration_v10.sql, which are visible to admins in the "All users" view.
    UserID: {
      type: DataTypes.INTEGER,
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

const { literal } = require("sequelize");
const { Notification, User, Role } = require("../models");
const { ADMIN_ROLE_NAME, isAdminRole } = require("../constants/roles");

const NOTIFICATION_FETCH_LIMIT = 50;

const uniqueRecipientIds = (userIds = []) =>
  [...new Set(userIds.filter((id) => id != null).map(Number))];

/**
 * Creates one notification row per recipient. This is the single reusable
 * entry point every part of the app should call instead of writing to the
 * Notification model directly.
 *
 * @param {object} params
 * @param {string} params.type - One of the NOTIFICATION_TYPE_* constants.
 * @param {string} params.message - Human-readable notification text.
 * @param {number|null} [params.relatedInvoiceId] - Optional InvoiceID this notification refers to.
 * @param {number[]} params.userIds - Users who should receive this notification.
 * @param {import("sequelize").Transaction} [transaction] - Optional active transaction.
 */
const notify = async ({ type, message, relatedInvoiceId = null, userIds = [] }, transaction) => {
  const created = [];
  for (const userId of uniqueRecipientIds(userIds)) {
    created.push(
      await Notification.create(
        {
          Type: type,
          Message: message,
          RelatedInvoiceID: relatedInvoiceId,
          UserID: userId,
          // Generated server-side so a DATETIME column never receives an
          // ISO string with a timezone offset.
          CreatedAt: literal("GETDATE()"),
        },
        { transaction }
      )
    );
  }
  return created;
};

const getActiveAdminUserIds = async (transaction) => {
  const admins = await User.findAll({
    where: { IsActive: true },
    include: [{ model: Role, as: "role", where: { RoleName: ADMIN_ROLE_NAME }, attributes: [] }],
    attributes: ["UserID"],
    transaction,
  });
  return admins.map(({ UserID }) => UserID);
};

// Sends a notification to every active admin (e.g. access requests).
const notifyAdmins = async ({ type, message, relatedInvoiceId = null }, transaction) => {
  const userIds = await getActiveAdminUserIds(transaction);
  return notify({ type, message, relatedInvoiceId, userIds }, transaction);
};

// A user always gets only their own feed. An admin can pass scope "all" to
// see every user's notifications, including who each one was sent to.
const getNotificationsForUser = async ({ user, scope }) => {
  const showAll = scope === "all" && isAdminRole(user.RoleName);

  return await Notification.findAll({
    where: showAll ? {} : { UserID: user.UserID },
    include: showAll
      ? [{ model: User, as: "recipient", attributes: ["UserID", "FullName", "Email"] }]
      : [],
    order: [["CreatedAt", "DESC"]],
    limit: NOTIFICATION_FETCH_LIMIT,
  });
};

// Users can delete only their own notifications; admins can delete any.
const deleteNotification = async ({ user, notificationId }) => {
  const where = isAdminRole(user.RoleName)
    ? { NotificationID: notificationId }
    : { NotificationID: notificationId, UserID: user.UserID };
  return await Notification.destroy({ where });
};

const clearNotifications = async ({ user }) => {
  return await Notification.destroy({ where: { UserID: user.UserID } });
};

module.exports = {
  notify,
  notifyAdmins,
  getNotificationsForUser,
  deleteNotification,
  clearNotifications,
};

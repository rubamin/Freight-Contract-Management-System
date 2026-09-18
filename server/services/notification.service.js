const { Op, literal } = require("sequelize");
const { Notification } = require("../models");

const NOTIFICATION_FETCH_LIMIT = 50;

/**
 * Creates a notification record. This is the single reusable entry point
 * every part of the app should call instead of writing to the Notification
 * model directly, so notification-creation logic isn't duplicated across
 * controllers.
 *
 * @param {object} params
 * @param {string} params.type - One of the NOTIFICATION_TYPE_* constants.
 * @param {string} params.message - Human-readable notification text.
 * @param {number|null} [params.relatedInvoiceId] - Optional InvoiceID this notification refers to.
 * @param {import("sequelize").Transaction} [transaction] - Optional active transaction.
 */
const notify = async ({ type, message, relatedInvoiceId = null }, transaction) => {
  return await Notification.create(
    {
      Type: type,
      Message: message,
      RelatedInvoiceID: relatedInvoiceId,
      // Force SQL Server to generate the timestamp server-side so we never
      // hand Sequelize an ISO string with a timezone offset for a DATETIME
      // column.
      CreatedAt: literal("GETDATE()"),
    },
    { transaction }
  );
};

/**
 * Fetches recent notifications, optionally only those created after `since`.
 * Used by the polling endpoint the frontend NotificationCenter hook calls.
 */
const getRecentNotifications = async ({ since } = {}) => {
  return await Notification.findAll({
    where: since ? { CreatedAt: { [Op.gt]: since } } : {},
    order: [["CreatedAt", "DESC"]],
    limit: NOTIFICATION_FETCH_LIMIT,
  });
};

module.exports = { notify, getRecentNotifications };

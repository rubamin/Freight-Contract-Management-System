const sequelize = require("../config/database");
const { DEFAULT_NOTIFICATION_EMAIL } = require("../constants/email");

/**
 * Resolves the notification recipient email for a given plant/location by
 * looking up ApprovalConfig.LocationID. Falls back to the default
 * notification email when no location is given or no active config entry
 * exists for it.
 *
 * Shared by both the single-invoice upload flow and the bulk "send selected
 * invoices" flow so the ApprovalConfig lookup logic lives in one place.
 *
 * @param {number|string|null|undefined} locationId - LocationID to look up in ApprovalConfig.
 * @param {import("sequelize").Transaction} [transaction] - Optional active transaction.
 * @returns {Promise<string>} Recipient email address.
 */
const getRecipientEmailForLocation = async (locationId, transaction) => {
  if (!locationId) {
    return DEFAULT_NOTIFICATION_EMAIL;
  }

  const approvalConfig = await sequelize.query(`
    SELECT TOP 1 PrimaryEmail, OptionalEmail, IsPrimaryActive, IsOptionalActive 
    FROM ApprovalConfig 
    WHERE LocationID = :locationId
  `, {
    replacements: { locationId },
    type: sequelize.QueryTypes.SELECT,
    transaction
  });

  const config = approvalConfig && approvalConfig[0];
  if (!config) {
    return DEFAULT_NOTIFICATION_EMAIL;
  }

  if (config.IsPrimaryActive && config.PrimaryEmail) {
    return config.PrimaryEmail;
  }

  if (config.IsOptionalActive && config.OptionalEmail) {
    return config.OptionalEmail;
  }

  return DEFAULT_NOTIFICATION_EMAIL;
};

module.exports = { getRecipientEmailForLocation };

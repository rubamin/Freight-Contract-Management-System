// Notification event types the bell/notification feed understands.
// Centralized so callers don't hardcode the same literal strings.
const NOTIFICATION_TYPE_INVOICE_CREATED = "INVOICE_CREATED";
const NOTIFICATION_TYPE_DISCREPANCY_DETECTED = "DISCREPANCY_DETECTED";
const NOTIFICATION_TYPE_EMAIL_SENT = "EMAIL_SENT";
// A user requested access to a plant/location they don't currently have
// permission for (task item 5's "Request Location Access" action).
const NOTIFICATION_TYPE_LOCATION_ACCESS_REQUESTED = "LOCATION_ACCESS_REQUESTED";
// Generalized access-request flow (task item 19/20): a user requested any
// module/location permission, and the two outcomes when an admin resolves it.
const NOTIFICATION_TYPE_ACCESS_REQUESTED = "ACCESS_REQUESTED";
const NOTIFICATION_TYPE_ACCESS_REQUEST_APPROVED = "ACCESS_REQUEST_APPROVED";
const NOTIFICATION_TYPE_ACCESS_REQUEST_REJECTED = "ACCESS_REQUEST_REJECTED";

module.exports = {
  NOTIFICATION_TYPE_INVOICE_CREATED,
  NOTIFICATION_TYPE_DISCREPANCY_DETECTED,
  NOTIFICATION_TYPE_EMAIL_SENT,
  NOTIFICATION_TYPE_LOCATION_ACCESS_REQUESTED,
  NOTIFICATION_TYPE_ACCESS_REQUESTED,
  NOTIFICATION_TYPE_ACCESS_REQUEST_APPROVED,
  NOTIFICATION_TYPE_ACCESS_REQUEST_REJECTED,
};

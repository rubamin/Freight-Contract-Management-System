// Notification feed settings shared by useNotifications and NotificationCenter.
export const NOTIFICATION_POLL_INTERVAL_MS = 30000;
export const NOTIFICATION_SOUND_URL = "/assets/notification-sound.wav";
export const NOTIFICATION_LAST_SEEN_STORAGE_KEY = "notificationsLastSeenAt";

// Browsers stack every desktop alert, so a burst is capped per poll.
export const MAX_DESKTOP_ALERTS_PER_POLL = 3;
export const DESKTOP_NOTIFICATION_ICON_URL = "/favicon.svg";

export const NOTIFICATION_SCOPE = {
  MINE: "mine",
  ALL: "all",
};

export const DEFAULT_NOTIFICATION_TITLE = "Freight Contract";

// Desktop alert titles per backend NOTIFICATION_TYPE_* value.
export const NOTIFICATION_TITLES = {
  INVOICE_CREATED: "New invoice uploaded",
  DISCREPANCY_DETECTED: "Invoice discrepancy detected",
  EMAIL_SENT: "Audit email sent",
  LOCATION_ACCESS_REQUESTED: "Location access requested",
  ACCESS_REQUESTED: "Access requested",
  ACCESS_REQUEST_APPROVED: "Access request approved",
  ACCESS_REQUEST_REJECTED: "Access request rejected",
  APPROVAL_REQUIRED: "Invoice waiting for your approval",
  INVOICE_SHARED: "Invoice shared with you",
  INVOICE_APPROVED: "Invoice approved",
  INVOICE_REJECTED: "Invoice rejected",
  DRAFT_SHARED: "Invoice draft shared with you",
  MASTER_APPROVAL_REQUIRED: "Master change waiting for your approval",
  MASTER_REQUEST_APPROVED: "Master change approved",
  MASTER_REQUEST_REJECTED: "Master change rejected",
};

export const getNotificationTitle = (type) =>
  NOTIFICATION_TITLES[type] || DEFAULT_NOTIFICATION_TITLE;

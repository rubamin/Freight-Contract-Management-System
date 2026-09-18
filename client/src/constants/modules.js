// Mirrors server/constants/modules.js - keep both in sync when adding a
// module (coding standard: repeated values live in one constants file per
// side, since client and server can't literally share a JS module here).
export const MODULE_KEYS = {
  VENDOR_MASTER: "vendors",
  CONTRACT_MASTER: "contracts",
  DESTINATION_MASTER: "destinations",
  WEIGHT_MASTER: "weights",
  VEHICLE_TYPE_MASTER: "vehicle-types",
  CUSTOMER_MASTER: "customers",
  USER_MASTER: "users",
  INVOICES: "invoices",
  REPORTS: "reports",
  SETTINGS_HIERARCHY: "settings",
};

export const MODULE_LABELS = {
  [MODULE_KEYS.VENDOR_MASTER]: "Vendor Master",
  [MODULE_KEYS.CONTRACT_MASTER]: "Contract Master",
  [MODULE_KEYS.DESTINATION_MASTER]: "Destination Master",
  [MODULE_KEYS.WEIGHT_MASTER]: "Weight Master",
  [MODULE_KEYS.VEHICLE_TYPE_MASTER]: "Vehicle Type Master",
  [MODULE_KEYS.CUSTOMER_MASTER]: "Customer Master",
  [MODULE_KEYS.USER_MASTER]: "User Master",
  [MODULE_KEYS.INVOICES]: "Invoices",
  [MODULE_KEYS.REPORTS]: "Reports",
  [MODULE_KEYS.SETTINGS_HIERARCHY]: "Settings & Hierarchy",
};

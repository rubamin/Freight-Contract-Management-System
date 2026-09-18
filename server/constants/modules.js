// Canonical list of permission-scoped modules (task item 4). Both the
// sidebar (built from a user's permissions) and the User Master
// permission-matrix editor use these same keys, so a module only ever
// needs to be added/renamed in this one place.
const MODULE_KEYS = {
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

// Display labels for the same keys, used by the User Master permission
// matrix so the UI doesn't have to hardcode module names separately.
const MODULE_LABELS = {
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

module.exports = { MODULE_KEYS, MODULE_LABELS };

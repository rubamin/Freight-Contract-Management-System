const { MODULE_KEYS, MODULE_LABELS } = require("./modules");

const MAINTENANCE_ACTIONS = {
  DELETE: "delete",
  TRUNCATE: "truncate",
};

// AuditLogs.ActionType is VARCHAR(20), so these must stay short.
const MAINTENANCE_AUDIT_ACTIONS = {
  [MAINTENANCE_ACTIONS.DELETE]: "MODULE_DELETE",
  [MAINTENANCE_ACTIONS.TRUNCATE]: "MODULE_TRUNCATE",
};

// Tables owned by a user row. Cleared before the user itself is removed,
// both by the User Master module wipe and by a single-user hard delete.
const USER_CHILD_TABLES = [
  "UserModulePermission",
  "UserLocationPermission",
  "UserPreferences",
  "AccessRequest",
  "Notifications",
  "ApprovalWorkflowStepUsers",
  "MasterApprovalApprovers",
  // Shares first (drafts shared with the user), then the user's own drafts;
  // shares of those drafts are removed by ON DELETE CASCADE.
  "InvoiceDraftShares",
  "InvoiceDrafts",
  "PasswordHistories",
  "PasswordOtps",
];

// Every table name here is a fixed server-side constant and the only
// table names ever interpolated into maintenance SQL. Tables are listed
// child-first so rows are removed in foreign-key-safe order.
//
// A step's optional "where" limits the delete to the rows that belong to
// the module (e.g. only invoice-related notifications).
//
// "preserveAdmins" keeps every Admin-role user (and their child rows) so
// a User Master wipe can never lock all administrators out.
const MAINTENANCE_MODULES = {
  [MODULE_KEYS.INVOICES]: {
    steps: [
      { table: "InvoiceWorkflowEvents" },
      { table: "InvoiceApprovalTasks" },
      { table: "InvoiceApprovalHistory" },
      { table: "InvoiceVerification" },
      { table: "InvoiceItems" },
      { table: "Notifications", where: "[RelatedInvoiceID] IS NOT NULL" },
      { table: "InvoiceHeader" },
    ],
  },
  [MODULE_KEYS.CONTRACT_MASTER]: {
    steps: [{ table: "ContractRateMatrix" }, { table: "ContractMaster" }],
  },
  [MODULE_KEYS.VENDOR_MASTER]: {
    steps: [{ table: "VendorGST" }, { table: "Vendors" }],
  },
  [MODULE_KEYS.DESTINATION_MASTER]: {
    steps: [{ table: "DestinationMaster" }],
  },
  [MODULE_KEYS.WEIGHT_MASTER]: {
    steps: [{ table: "WeightMaster" }],
  },
  [MODULE_KEYS.VEHICLE_TYPE_MASTER]: {
    steps: [{ table: "VehicleTypes" }],
  },
  [MODULE_KEYS.CUSTOMER_MASTER]: {
    steps: [{ table: "CustomerMaster" }],
  },
  [MODULE_KEYS.USER_MASTER]: {
    preserveAdmins: true,
    steps: [...USER_CHILD_TABLES.map((table) => ({ table })), { table: "Users" }],
  },
};

const getMaintenanceModuleLabel = (moduleKey) => MODULE_LABELS[moduleKey] || moduleKey;

module.exports = {
  MAINTENANCE_ACTIONS,
  MAINTENANCE_AUDIT_ACTIONS,
  MAINTENANCE_MODULES,
  USER_CHILD_TABLES,
  getMaintenanceModuleLabel,
};

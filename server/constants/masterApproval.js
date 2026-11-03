const { MODULE_KEYS, MODULE_LABELS } = require("./modules");

// Master approval workflow constants - keep in sync with
// client/src/constants/masterApproval.js. Database CHECK constraints
// (migration_v16.sql) use the same literal values.

// Masters whose Add / Edit the admin can put behind an approval.
const MASTER_APPROVAL_MODULE_KEYS = [
  MODULE_KEYS.VENDOR_MASTER,
  MODULE_KEYS.CONTRACT_MASTER,
  MODULE_KEYS.DESTINATION_MASTER,
  MODULE_KEYS.WEIGHT_MASTER,
  MODULE_KEYS.VEHICLE_TYPE_MASTER,
  MODULE_KEYS.CUSTOMER_MASTER,
];

const MASTER_ACTIONS = {
  ADD: "ADD",
  EDIT: "EDIT",
};

const MASTER_ACTION_LABELS = {
  [MASTER_ACTIONS.ADD]: "Add",
  [MASTER_ACTIONS.EDIT]: "Edit",
};

// SINGLE: one record from the Add / Edit form. BULK: an Excel bulk upload.
const MASTER_REQUEST_OPERATIONS = {
  SINGLE: "SINGLE",
  BULK: "BULK",
};

const MASTER_REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

// ?view= of the request list.
const MASTER_REQUEST_VIEWS = {
  WAITING: "waiting",
  MINE: "mine",
  ALL: "all",
};

const MASTER_REQUEST_DECISIONS = {
  APPROVE: "approve",
  REJECT: "reject",
};

// Kept outside uploads/, which is served publicly.
const MASTER_REQUEST_UPLOAD_DIR = "master_request_uploads";

const MAX_MASTER_REQUEST_REMARKS_LENGTH = 1000;
const MAX_MASTER_REQUEST_LABEL_LENGTH = 300;
const MAX_MASTER_REQUEST_LIST_ROWS = 500;

const getMasterLabel = (moduleKey) => MODULE_LABELS[moduleKey] || moduleKey;

module.exports = {
  MASTER_APPROVAL_MODULE_KEYS,
  MASTER_ACTIONS,
  MASTER_ACTION_LABELS,
  MASTER_REQUEST_OPERATIONS,
  MASTER_REQUEST_STATUS,
  MASTER_REQUEST_VIEWS,
  MASTER_REQUEST_DECISIONS,
  MASTER_REQUEST_UPLOAD_DIR,
  MAX_MASTER_REQUEST_REMARKS_LENGTH,
  MAX_MASTER_REQUEST_LABEL_LENGTH,
  MAX_MASTER_REQUEST_LIST_ROWS,
  getMasterLabel,
};

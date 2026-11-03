import { MODULE_KEYS } from "./modules";

// Mirrors server/constants/masterApproval.js - keep both in sync.
export const MASTER_APPROVAL_MODULE_KEYS = [
  MODULE_KEYS.VENDOR_MASTER,
  MODULE_KEYS.CONTRACT_MASTER,
  MODULE_KEYS.DESTINATION_MASTER,
  MODULE_KEYS.WEIGHT_MASTER,
  MODULE_KEYS.VEHICLE_TYPE_MASTER,
  MODULE_KEYS.CUSTOMER_MASTER,
];

export const MASTER_ACTIONS = {
  ADD: "ADD",
  EDIT: "EDIT",
};

export const MASTER_ACTION_CONFIG = {
  [MASTER_ACTIONS.ADD]: { label: "Add", color: "success" },
  [MASTER_ACTIONS.EDIT]: { label: "Edit", color: "info" },
};

export const MASTER_REQUEST_OPERATIONS = {
  SINGLE: "SINGLE",
  BULK: "BULK",
};

export const MASTER_REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

export const MASTER_REQUEST_STATUS_CONFIG = {
  [MASTER_REQUEST_STATUS.PENDING]: { label: "Pending", color: "warning" },
  [MASTER_REQUEST_STATUS.APPROVED]: { label: "Approved", color: "success" },
  [MASTER_REQUEST_STATUS.REJECTED]: { label: "Rejected", color: "error" },
  [MASTER_REQUEST_STATUS.CANCELLED]: { label: "Cancelled", color: "default" },
};

export const MASTER_REQUEST_VIEWS = {
  WAITING: "waiting",
  MINE: "mine",
  ALL: "all",
};

export const MASTER_REQUEST_DECISIONS = {
  APPROVE: "approve",
  REJECT: "reject",
};

export const MAX_MASTER_REQUEST_REMARKS_LENGTH = 1000;

// Payload fields that are internal or repeat another field, never shown
// in the request details.
export const HIDDEN_REQUEST_FIELDS = ["gstDetails", "Remarks", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy"];

// Longer values (e.g. edited rate sheets) are summarised, not printed.
export const MAX_REQUEST_VALUE_LENGTH = 160;

// Bulk upload rows shown in the request details.
export const MAX_BULK_PREVIEW_ROWS = 50;

export const MASTER_APPROVALS_PATH = "/master-approvals";
export const MASTER_APPROVAL_SETTINGS_PATH = "/admin/master-approval-workflow";

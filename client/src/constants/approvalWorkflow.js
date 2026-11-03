// Mirrors server/constants/approvalWorkflow.js - keep both in sync.

export const STEP_TYPES = {
  APPROVAL: "APPROVAL",
  NOTIFY: "NOTIFY",
};

export const STEP_TYPE_OPTIONS = [
  { value: STEP_TYPES.APPROVAL, label: "Approval", description: "Must approve before the invoice moves on" },
  { value: STEP_TYPES.NOTIFY, label: "Notify only", description: "Receives the invoice for information or processing" },
];

export const ASSIGN_MODES = {
  UPLOADER_SELECTS: "UPLOADER_SELECTS",
  ALL_USERS: "ALL_USERS",
};

export const ASSIGN_MODE_OPTIONS = [
  { value: ASSIGN_MODES.UPLOADER_SELECTS, label: "Uploader selects one", description: "The user entering the invoice picks one of these users (e.g. HOD)" },
  { value: ASSIGN_MODES.ALL_USERS, label: "All users", description: "Every user here receives it; any one of them can act (e.g. Accounts)" },
];

export const APPROVAL_STATUS = {
  PRE_APPROVED: "PRE_APPROVED",
  APPROVED: "APPROVED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED",
};

export const APPROVAL_STATUS_CONFIG = {
  [APPROVAL_STATUS.PRE_APPROVED]: { label: "Pre-Approved", color: "info" },
  [APPROVAL_STATUS.APPROVED]: { label: "Approved", color: "success" },
  [APPROVAL_STATUS.PENDING_APPROVAL]: { label: "Pending for Approval", color: "warning" },
  [APPROVAL_STATUS.REJECTED]: { label: "Rejected", color: "error" },
};

export const getApprovalStatusConfig = (status) =>
  APPROVAL_STATUS_CONFIG[status] || { label: status || "-", color: "default" };

export const ROUTING_OUTCOMES = {
  DISCREPANCY: "DISCREPANCY",
  SYSTEM_APPROVED: "SYSTEM_APPROVED",
  PRE_APPROVED: "PRE_APPROVED",
};

export const ROUTING_OPTIONS = [
  { value: ROUTING_OUTCOMES.DISCREPANCY, label: "Discrepancy invoices start at", required: true },
  { value: ROUTING_OUTCOMES.SYSTEM_APPROVED, label: "System approved invoices go to", required: false },
  { value: ROUTING_OUTCOMES.PRE_APPROVED, label: "Pre-approved invoices go to", required: false },
];

export const TASK_STATUS_LABELS = {
  PENDING: "Waiting",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NOTIFIED: "Shared",
  CLOSED: "Closed (acted by another user)",
  CANCELLED: "Cancelled (invoice edited)",
};

export const EVENT_TYPE_LABELS = {
  DRAFT_CREATED: "Saved as draft",
  CREATED: "Invoice created",
  SENT_TO_UPLOADER: "Discrepancy mail to uploader",
  SUBMITTED_FOR_APPROVAL: "Sent for approval",
  FORWARDED: "Forwarded",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FINAL_APPROVED: "Fully approved",
  WORKFLOW_RESTARTED: "Edited - workflow restarted",
  NO_ROUTING: "Not routed",
};

export const MAX_WORKFLOW_STEPS = 10;
export const MAX_STEP_NAME_LENGTH = 100;
export const MAX_ACTION_REMARKS_LENGTH = 1000;

export const MY_APPROVALS_VIEWS = {
  PENDING: "pending",
  HISTORY: "history",
};

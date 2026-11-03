// Approval workflow constants - keep in sync with
// client/src/constants/approvalWorkflow.js. Database CHECK constraints
// (migration_v14.sql) use the same literal values.

// APPROVAL steps must approve before the invoice moves on; NOTIFY steps
// only receive it (e.g. Accounts after the HOD approved).
const STEP_TYPES = {
  APPROVAL: "APPROVAL",
  NOTIFY: "NOTIFY",
};

// UPLOADER_SELECTS: the uploader picks one step user on Add Invoice (HOD).
// ALL_USERS: every step user receives it, any one of them can act.
const ASSIGN_MODES = {
  UPLOADER_SELECTS: "UPLOADER_SELECTS",
  ALL_USERS: "ALL_USERS",
};

// InvoiceHeader.ApprovalStatus values.
const APPROVAL_STATUS = {
  PRE_APPROVED: "PRE_APPROVED",
  APPROVED: "APPROVED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  REJECTED: "REJECTED",
};

const APPROVAL_STATUS_LABELS = {
  [APPROVAL_STATUS.PRE_APPROVED]: "Pre-Approved",
  [APPROVAL_STATUS.APPROVED]: "Approved",
  [APPROVAL_STATUS.PENDING_APPROVAL]: "Pending for Approval",
  [APPROVAL_STATUS.REJECTED]: "Rejected",
};

// InvoiceApprovalTasks.TaskStatus values. CLOSED marks the other users of
// an ALL_USERS step once one of them acted; CANCELLED marks open tasks of
// a workflow restarted by an invoice edit.
const TASK_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NOTIFIED: "NOTIFIED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
};

// InvoiceWorkflowEvents.EventType values (VARCHAR(40)).
const EVENT_TYPES = {
  DRAFT_CREATED: "DRAFT_CREATED",
  CREATED: "CREATED",
  EDITED: "EDITED",
  SENT_TO_UPLOADER: "SENT_TO_UPLOADER",
  SUBMITTED_FOR_APPROVAL: "SUBMITTED_FOR_APPROVAL",
  FORWARDED: "FORWARDED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FINAL_APPROVED: "FINAL_APPROVED",
  WORKFLOW_RESTARTED: "WORKFLOW_RESTARTED",
  NO_ROUTING: "NO_ROUTING",
};

// Audit outcomes that can be routed (ApprovalWorkflowSettings columns).
const ROUTING_OUTCOMES = {
  DISCREPANCY: "DISCREPANCY",
  SYSTEM_APPROVED: "SYSTEM_APPROVED",
  PRE_APPROVED: "PRE_APPROVED",
};

// Status an invoice keeps when its outcome is not routed to any step.
const UNROUTED_STATUS = {
  [ROUTING_OUTCOMES.DISCREPANCY]: APPROVAL_STATUS.PENDING_APPROVAL,
  [ROUTING_OUTCOMES.SYSTEM_APPROVED]: APPROVAL_STATUS.APPROVED,
  [ROUTING_OUTCOMES.PRE_APPROVED]: APPROVAL_STATUS.PRE_APPROVED,
};

const MAX_WORKFLOW_STEPS = 10;
const MAX_STEP_NAME_LENGTH = 100;
const MAX_ACTION_REMARKS_LENGTH = 1000;

module.exports = {
  STEP_TYPES,
  ASSIGN_MODES,
  APPROVAL_STATUS,
  APPROVAL_STATUS_LABELS,
  TASK_STATUS,
  EVENT_TYPES,
  ROUTING_OUTCOMES,
  UNROUTED_STATUS,
  MAX_WORKFLOW_STEPS,
  MAX_STEP_NAME_LENGTH,
  MAX_ACTION_REMARKS_LENGTH,
};

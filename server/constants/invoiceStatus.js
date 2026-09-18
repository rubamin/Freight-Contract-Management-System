// Shared status-name constants so the same literal strings aren't
// duplicated across the invoice upload flow and the dashboard aggregations.

// StatusMaster.StatusName value assigned to every invoice at creation time
// (see invoiceDocumentController.js) until it moves through the approval
// workflow.
const PENDING_VERIFICATION_STATUS_NAME = "Pending Verification";

// InvoiceVerification.VerificationStatus values written during invoice
// upload audit (see invoiceDocumentController.js's finalAuditDecision).
const VERIFICATION_STATUS_APPROVED = "APPROVED";
const VERIFICATION_STATUS_DISCREPANCY = "DISCREPANCY";
// Set whenever the uploader ticked "Pre-Approved" on the Add/Edit Invoice
// grid — takes priority over the computed contract-match outcome so a
// pre-approved invoice always displays as Pre-Approved rather than
// whatever the automated audit happened to compute.
const VERIFICATION_STATUS_PRE_APPROVED = "PRE_APPROVED";

module.exports = {
  PENDING_VERIFICATION_STATUS_NAME,
  VERIFICATION_STATUS_APPROVED,
  VERIFICATION_STATUS_DISCREPANCY,
  VERIFICATION_STATUS_PRE_APPROVED,
};

const createModuleRouter = require("./moduleRouteFactory");
const workflowController = require("../controllers/workflow.controller");
const {
  InvoiceVerification,
  VerificationError,
  InvoiceApprovalHistory,
  InvoiceStatusHistory,
  AuditLog,
  EmailLog,
} = require("../models");

const registry = {
  verifications: {
    model: InvoiceVerification,
    tableName: "InvoiceVerification",
    primaryKey: "VerificationID",
    searchFields: ["VerificationStatus"],
    sortFields: ["VerificationID", "InvoiceID", "ContractID", "VerifiedDate"],
    include: [{ model: VerificationError, as: "errors" }],
  },
  "verification-errors": {
    model: VerificationError,
    tableName: "VerificationErrors",
    primaryKey: "ErrorID",
    searchFields: ["ErrorType", "FieldName", "Remarks"],
    sortFields: ["ErrorID", "VerificationID", "ErrorType", "FieldName"],
  },
  approvals: {
    model: InvoiceApprovalHistory,
    tableName: "InvoiceApprovalHistory",
    primaryKey: "ApprovalID",
    searchFields: ["Remarks"],
    sortFields: ["ApprovalID", "InvoiceID", "ApprovedBy", "StatusID", "ApprovedDate"],
  },
  "status-history": {
    model: InvoiceStatusHistory,
    tableName: "InvoiceStatusHistory",
    primaryKey: "HistoryID",
    searchFields: ["Remarks"],
    sortFields: ["HistoryID", "InvoiceID", "ChangedBy", "ChangedDate"],
  },
  audits: {
    model: AuditLog,
    tableName: "AuditLogs",
    primaryKey: "AuditID",
    searchFields: ["TableName", "ActionType", "IPAddress"],
    sortFields: ["AuditID", "UserID", "TableName", "ActionType", "ActionDate"],
  },
  emails: {
    model: EmailLog,
    tableName: "EmailLogs",
    primaryKey: "EmailLogID",
    searchFields: ["RecipientEmail", "Subject", "Status"],
    sortFields: ["EmailLogID", "RecipientEmail", "Status", "SentAt"],
  },
};

const router = createModuleRouter(registry);

router.post(
  "/verifications/run/:invoiceId",
  workflowController.runInvoiceVerification
);

router.post(
  "/approvals/invoices/:invoiceId",
  workflowController.approveInvoice
);

module.exports = router;

const express = require("express");
const router = express.Router();

const approvalWorkflowController = require("../controllers/approvalWorkflow.controller");
const authMiddleware = require("../middleware/authMiddleware");
const { requireModulePermission, requireWorkflowApprover } = require("../middleware/permissionMiddleware");
const { MODULE_KEYS } = require("../constants/modules");

router.use(authMiddleware);

// Workflow configuration - Hierarchy & Approval Workflow page.
router.get("/locations/:locationId", approvalWorkflowController.getLocationWorkflow);
router.put(
  "/locations/:locationId",
  requireModulePermission(MODULE_KEYS.SETTINGS_HIERARCHY, "edit"),
  approvalWorkflowController.saveLocationWorkflow
);

// Approver list the uploader picks from on Add Invoice.
router.get("/locations/:locationId/selectable-approvers", approvalWorkflowController.getSelectableApprovers);

// My Approvals page - only for users assigned to a workflow step (and admins).
router.get("/my-tasks", requireWorkflowApprover, approvalWorkflowController.getMyTasks);
router.get("/my-tasks/count", requireWorkflowApprover, approvalWorkflowController.getPendingTaskCount);
router.post("/invoices/:invoiceId/approve", approvalWorkflowController.approveInvoice);
router.post("/invoices/:invoiceId/reject", approvalWorkflowController.rejectInvoice);

// Full approval record of one invoice (Invoice List).
router.get("/invoices/:invoiceId/timeline", approvalWorkflowController.getInvoiceTimeline);

module.exports = router;

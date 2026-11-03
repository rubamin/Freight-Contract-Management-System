const express = require("express");
const router = express.Router();

const masterApprovalController = require("../controllers/masterApprovalController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/permissionMiddleware");

router.use(authMiddleware);

// Master Approval Workflow page - Admin only.
router.get("/settings", requireAdmin, masterApprovalController.getSettings);
router.put("/settings", requireAdmin, masterApprovalController.saveSettings);

// Master Approvals page - every user sees their own requests; approvers
// and admins also see the ones waiting for them.
router.get("/requests", masterApprovalController.listRequests);
router.get("/requests/summary", masterApprovalController.getSummary);
router.get("/requests/:id", masterApprovalController.getRequest);
router.get("/requests/:id/file", masterApprovalController.downloadRequestFile);
router.post("/requests/:id/approve", masterApprovalController.approveRequest);
router.post("/requests/:id/reject", masterApprovalController.rejectRequest);
router.post("/requests/:id/cancel", masterApprovalController.cancelRequest);

module.exports = router;

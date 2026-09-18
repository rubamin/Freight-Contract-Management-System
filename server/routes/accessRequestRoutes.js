const express = require("express");
const router = express.Router();

const accessRequestController = require("../controllers/accessRequestController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/permissionMiddleware");

router.use(authMiddleware);

// Any authenticated user can request access (task item 19).
router.post("/", accessRequestController.createAccessRequest);

// Admin-only: view/resolve pending requests (task item 20).
router.get("/pending", requireAdmin, accessRequestController.listPendingRequests);
router.put("/:id/resolve", requireAdmin, accessRequestController.resolveAccessRequest);

module.exports = router;

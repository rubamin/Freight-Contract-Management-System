const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/notifications?since=<ISO timestamp>
// Simple polling endpoint — the frontend calls this every 30s. Switch to
// Socket.io push only if polling proves insufficient in practice.
router.get("/", authMiddleware, notificationController.getRecentNotifications);

module.exports = router;

const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// GET /api/notifications?scope=all
// Polling endpoint (the frontend calls it every 30s). Returns only the
// logged-in user's notifications; admins may pass scope=all.
router.get("/", notificationController.getRecentNotifications);

// DELETE /api/notifications - clears all of the logged-in user's notifications.
router.delete("/", notificationController.clearNotifications);

// DELETE /api/notifications/:id - deletes a single notification.
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;

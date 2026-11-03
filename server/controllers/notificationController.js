const notificationService = require("../services/notification.service");
const { isAdminRole } = require("../constants/roles");

const sendError = (res, error, fallbackMessage) =>
  res.status(500).json({
    success: false,
    message: error.message || fallbackMessage,
  });

const getRecentNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotificationsForUser({
      user: req.user,
      scope: req.query.scope,
    });

    return res.status(200).json({
      success: true,
      isAdmin: isAdminRole(req.user.RoleName),
      data: notifications,
    });
  } catch (error) {
    return sendError(res, error, "Failed to load notifications.");
  }
};

const deleteNotification = async (req, res) => {
  try {
    const deletedCount = await notificationService.deleteNotification({
      user: req.user,
      notificationId: req.params.id,
    });

    if (!deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({ success: true, message: "Notification deleted." });
  } catch (error) {
    return sendError(res, error, "Failed to delete notification.");
  }
};

const clearNotifications = async (req, res) => {
  try {
    await notificationService.clearNotifications({ user: req.user });
    return res.status(200).json({ success: true, message: "Notifications cleared." });
  } catch (error) {
    return sendError(res, error, "Failed to clear notifications.");
  }
};

module.exports = { getRecentNotifications, deleteNotification, clearNotifications };

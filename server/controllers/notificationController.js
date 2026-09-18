const notificationService = require("../services/notification.service");

const getRecentNotifications = async (req, res) => {
  try {
    const { since } = req.query;
    const notifications = await notificationService.getRecentNotifications({ since });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load notifications.",
    });
  }
};

module.exports = { getRecentNotifications };

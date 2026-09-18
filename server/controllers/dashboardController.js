const dashboardService = require("../services/dashboard.service");

const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    const summary = await dashboardService.getDashboardSummary({ from, to });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load dashboard summary.",
    });
  }
};

module.exports = { getSummary };

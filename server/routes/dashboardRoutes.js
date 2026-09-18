const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");
const { validateDashboardSummaryQuery } = require("../validators/dashboardValidator");

// Single dedicated endpoint returning every dashboard card/chart value in
// one response. Accepts optional ?from=YYYY-MM-DD&to=YYYY-MM-DD to re-run
// the same aggregations over a specific date range.
router.get(
  "/summary",
  authMiddleware,
  validateDashboardSummaryQuery,
  dashboardController.getSummary
);

module.exports = router;

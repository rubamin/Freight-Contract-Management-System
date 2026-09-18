const Joi = require("joi");

const dashboardSummaryQuerySchema = Joi.object({
  from: Joi.date().iso().optional().messages({
    "date.format": "'from' must be a valid date (YYYY-MM-DD).",
  }),
  to: Joi.date().iso().min(Joi.ref("from")).optional().messages({
    "date.format": "'to' must be a valid date (YYYY-MM-DD).",
    "date.min": "'to' must be on or after 'from'.",
  }),
});

const validateDashboardSummaryQuery = (req, res, next) => {
  const { error, value } = dashboardSummaryQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      errors: error.details.map((err) => err.message),
    });
  }

  req.query = value;
  next();
};

module.exports = { validateDashboardSummaryQuery };

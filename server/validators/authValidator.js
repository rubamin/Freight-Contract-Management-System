const Joi = require("joi");

const loginSchema = Joi.object({
  Email: Joi.string().email().required().messages({
    "string.email": "Invalid Email Address.",
    "string.empty": "Email is required.",
  }),

  Password: Joi.string().required().messages({
    "string.empty": "Password is required.",
  }),
});

const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body, {
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

  next();
};

module.exports = {
  validateLogin,
};

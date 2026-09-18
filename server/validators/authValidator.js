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

<<<<<<< HEAD
const forgotPasswordSchema = Joi.object({
  Email: Joi.string().email().required().messages({
    "string.email": "Invalid Email Address.",
    "string.empty": "Email is required.",
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Reset token is required.",
  }),

  newPassword: Joi.string().min(8).required().messages({
    "string.empty": "New password is required.",
    "string.min": "Password must be at least 8 characters long.",
  }),
});

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
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

<<<<<<< HEAD
const validateForgotPassword = (req, res, next) => {
  const { error } = forgotPasswordSchema.validate(req.body, {
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

const validateResetPassword = (req, res, next) => {
  const { error } = resetPasswordSchema.validate(req.body, {
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
  validateForgotPassword,
  validateResetPassword,
=======
module.exports = {
  validateLogin,
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
};

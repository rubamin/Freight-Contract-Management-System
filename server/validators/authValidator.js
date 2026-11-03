const Joi = require("joi");
const { OTP_LENGTH } = require("../constants/password");

const PASSWORD_MISMATCH_MESSAGE = "The new password and the repeated password do not match.";

// Rules for the password itself are checked by password.service.js, which
// returns one clear message listing every rule that failed.
const newPasswordFields = {
  newPassword: Joi.string().required().messages({
    "string.empty": "New password is required.",
    "any.required": "New password is required.",
  }),
  confirmPassword: Joi.any().valid(Joi.ref("newPassword")).required().messages({
    "any.only": PASSWORD_MISMATCH_MESSAGE,
    "any.required": "Please repeat the new password.",
  }),
};

const emailField = Joi.string().email().required().messages({
  "string.email": "Invalid Email Address.",
  "string.empty": "Email is required.",
});

const loginSchema = Joi.object({
  Email: emailField,

  Password: Joi.string().required().messages({
    "string.empty": "Password is required.",
  }),
});

const forgotPasswordSchema = Joi.object({
  Email: emailField,
});

const resetPasswordSchema = Joi.object({
  Email: emailField,
  otp: Joi.string().pattern(new RegExp(`^\\d{${OTP_LENGTH}}$`)).required().messages({
    "string.pattern.base": `Enter the ${OTP_LENGTH}-digit code from the email.`,
    "string.empty": `Enter the ${OTP_LENGTH}-digit code from the email.`,
  }),
  ...newPasswordFields,
});

const setPasswordSchema = Joi.object(newPasswordFields);

const buildValidator = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
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
  newPasswordFields,
  buildValidator,
  validateLogin: buildValidator(loginSchema),
  validateForgotPassword: buildValidator(forgotPasswordSchema),
  validateResetPassword: buildValidator(resetPasswordSchema),
  validateSetPassword: buildValidator(setPasswordSchema),
};

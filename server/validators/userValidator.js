const Joi = require("joi");

const updateProfileSchema = Joi.object({
  FullName: Joi.string().trim().max(200).allow("").optional(),
  Email: Joi.string().email().required().messages({
    "string.email": "Invalid Email Address.",
    "string.empty": "Email is required.",
  }),
  MobileNo: Joi.string().trim().max(20).allow("").optional(),
});

const validateUpdateProfile = (req, res, next) => {
  const { error } = updateProfileSchema.validate(req.body, {
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

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required.",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.empty": "New password is required.",
    "string.min": "New password must be at least 6 characters long.",
  }),
});

const validateChangePassword = (req, res, next) => {
  const { error } = changePasswordSchema.validate(req.body, {
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

const updatePreferencesSchema = Joi.object({
  notificationEmailEnabled: Joi.boolean().optional(),
  notificationSoundEnabled: Joi.boolean().optional(),
  // Multi-select default plant list (task item 5). defaultPlantId (singular)
  // is no longer accepted from the client - the server derives it from the
  // first entry of defaultPlantIds for backward compatibility.
  defaultPlantIds: Joi.array().items(Joi.number().integer()).optional(),
});

const validateUpdatePreferences = (req, res, next) => {
  const { error } = updatePreferencesSchema.validate(req.body, {
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
  validateUpdateProfile,
  validateChangePassword,
  validateUpdatePreferences,
};

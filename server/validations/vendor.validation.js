const Joi = require("joi");

/**
 * PAN Validation
 * Example: ABCDE1234F
 */
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * GST Validation
 * Example: 24ABCDE1234F1Z5
 */
const gstRegex =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Mobile Validation
 */
const mobileRegex = /^[6-9]\d{9}$/;

/**
 * GST Object Schema
 */
const gstSchema = Joi.object({
  GSTNumber: Joi.string()
    .trim()
    .length(15)
    .pattern(gstRegex)
    .required()
    .messages({
      "string.empty": "GST Number is required.",
      "string.pattern.base": "Invalid GST Number.",
    }),

  StateName: Joi.string()
    .trim()
    .max(100)
    .required(),

  IsDefault: Joi.boolean().optional(),
});

/**
 * Vendor Schema
 */
const vendorSchema = Joi.object({
  VendorName: Joi.string()
    .trim()
    .max(300)
    .required()
    .messages({
      "string.empty": "Vendor Name is required.",
    }),

  Address: Joi.string()
    .allow("")
    .optional(),

  ContactPerson: Joi.string()
    .allow("")
    .max(200)
    .optional(),

  Email: Joi.string()
    .email()
    .allow("")
    .optional()
    .messages({
      "string.email": "Invalid Email Address.",
    }),

  MobileNo: Joi.string()
    .pattern(mobileRegex)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base": "Invalid Mobile Number.",
    }),

  PANNo: Joi.string()
    .length(10)
    .uppercase()
    .pattern(panRegex)
    .required()
    .messages({
      "string.empty": "PAN Number is required.",
      "string.pattern.base": "Invalid PAN Number.",
    }),

  IsActive: Joi.boolean().optional(),

  gstNumbers: Joi.array()
    .items(gstSchema)
    .min(1)
    .required()
    .messages({
      "array.min": "At least one GST Number is required.",
    }),
});

/**
 * Middleware
 */
const validateVendor = (req, res, next) => {
  const { error } = vendorSchema.validate(req.body, {
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

  /**
   * PAN Extraction Validation
   */
  const pan = req.body.PANNo.toUpperCase();

  for (const gst of req.body.gstNumbers) {
    const gstPAN = gst.GSTNumber.substring(2, 12);

    if (gstPAN !== pan) {
      return res.status(400).json({
        success: false,
        message: `PAN mismatch for GST Number ${gst.GSTNumber}`,
      });
    }
  }

  next();
};

module.exports = {
  validateVendor,
};
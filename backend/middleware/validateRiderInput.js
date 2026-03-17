// backend/middleware/validateRiderInput.js
const { body, param, validationResult } = require("express-validator");
const {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeAlphanumeric,
  isValidObjectId,
} = require("../utils/inputValidator");

/**
 * Validation middleware for rider onboarding submission
 */
exports.validateRiderOnboarding = [
  body("fullName")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters")
    .matches(/^[a-zA-Z\s\-']+$/).withMessage("Name can only contain letters, spaces, hyphens, and apostrophes")
    .customSanitizer(value => sanitizeString(value, 100)),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Valid email is required")
    .isLength({ max: 254 }).withMessage("Email too long")
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),

  body("phoneNumber")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]{10,20}$/).withMessage("Invalid phone number format")
    .customSanitizer(value => sanitizePhone(value)),

  body("nationalId")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("National ID too long")
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage("National ID can only contain letters, numbers, and hyphens")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

  body("vehicleType")
    .optional()
    .trim()
    .isIn(["bike", "motorbike", "van", "truck", "car"]).withMessage("Invalid vehicle type"),

  body("vehicleNumber")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Vehicle number too long")
    .matches(/^[a-zA-Z0-9\-\s]+$/).withMessage("Invalid vehicle number format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 20)),

  body("motorbikeModel")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Motorbike model too long")
    .matches(/^[a-zA-Z0-9\s\-]+$/).withMessage("Invalid motorbike model format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 100)),

  body("vehicleRegNumber")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Vehicle registration number too long")
    .matches(/^[a-zA-Z0-9\-\s]+$/).withMessage("Invalid vehicle registration format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 20)),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Notes too long")
    .customSanitizer(value => sanitizeString(value, 1000)),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

/**
 * Validation middleware for updating rider details
 */
exports.validateRiderDetailsUpdate = [
  param("riderId")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid rider ID format");
      }
      return true;
    }),

  body("nationalId")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("National ID too long")
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage("National ID can only contain letters, numbers, and hyphens")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

  body("motorbikeModel")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Motorbike model too long")
    .matches(/^[a-zA-Z0-9\s\-]+$/).withMessage("Invalid motorbike model format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 100)),

  body("vehicleRegNumber")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Vehicle registration number too long")
    .matches(/^[a-zA-Z0-9\-\s]+$/).withMessage("Invalid vehicle registration format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 20)),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

/**
 * Validation middleware for assigning sacco
 */
exports.validateSaccoAssignment = [
  param("riderId")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid rider ID format");
      }
      return true;
    }),

  body("saccoId")
    .trim()
    .notEmpty().withMessage("Sacco ID is required")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid sacco ID format");
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

/**
 * Validation middleware for status update
 */
exports.validateStatusUpdate = [
  param("riderId")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid rider ID format");
      }
      return true;
    }),

  body("status")
    .trim()
    .notEmpty().withMessage("Status is required")
    .isIn(["submitted", "pending", "active", "suspended", "rejected"]).withMessage("Invalid status"),

  body("rejectionReason")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Rejection reason too long")
    .customSanitizer(value => sanitizeString(value, 500)),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

/**
 * Validation middleware for rider ID parameter
 */
exports.validateRiderId = [
  param("riderId")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid rider ID format");
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

// backend/middleware/validateSaccoInput.js
const { body, param, validationResult } = require("express-validator");
const {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeAlphanumeric,
  isValidObjectId,
} = require("../utils/inputValidator");

/**
 * Validation middleware for sacco registration
 */
exports.validateSaccoRegistration = [
  body("name")
    .trim()
    .notEmpty().withMessage("Sacco name is required")
    .isLength({ min: 2, max: 200 }).withMessage("Name must be 2-200 characters")
    .matches(/^[a-zA-Z0-9\s\-'&]+$/).withMessage("Name can only contain letters, numbers, spaces, and basic punctuation")
    .customSanitizer(value => sanitizeString(value, 200)),

  body("registrationNumber")
    .trim()
    .notEmpty().withMessage("Registration number is required")
    .isLength({ max: 50 }).withMessage("Registration number too long")
    .matches(/^[a-zA-Z0-9\-\/]+$/).withMessage("Invalid registration number format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

  body("contactEmail")
    .trim()
    .notEmpty().withMessage("Contact email is required")
    .isEmail().withMessage("Valid email is required")
    .isLength({ max: 254 }).withMessage("Email too long")
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),

  body("contactPhone")
    .trim()
    .notEmpty().withMessage("Contact phone is required")
    .matches(/^[0-9+\-\s()]{10,20}$/).withMessage("Invalid phone number format")
    .customSanitizer(value => sanitizePhone(value)),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Address too long")
    .customSanitizer(value => sanitizeString(value, 500)),

  body("chairman")
    .optional()
    .isObject().withMessage("Chairman must be an object"),

  body("chairman.fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Chairman name must be 2-100 characters")
    .matches(/^[a-zA-Z\s\-']+$/).withMessage("Name can only contain letters, spaces, hyphens, and apostrophes")
    .customSanitizer(value => sanitizeString(value, 100)),

  body("chairman.phoneNumber")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{10,20}$/).withMessage("Invalid phone number format")
    .customSanitizer(value => sanitizePhone(value)),

  body("chairman.email")
    .optional()
    .trim()
    .isEmail().withMessage("Valid email is required")
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),

  body("chairman.idNumber")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("ID number too long")
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage("ID number can only contain letters, numbers, and hyphens")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

  body("secretary")
    .optional()
    .isObject().withMessage("Secretary must be an object"),

  body("secretary.fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Secretary name must be 2-100 characters")
    .matches(/^[a-zA-Z\s\-']+$/).withMessage("Name can only contain letters, spaces, hyphens, and apostrophes")
    .customSanitizer(value => sanitizeString(value, 100)),

  body("secretary.phoneNumber")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{10,20}$/).withMessage("Invalid phone number format")
    .customSanitizer(value => sanitizePhone(value)),

  body("secretary.email")
    .optional()
    .trim()
    .isEmail().withMessage("Valid email is required")
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),

  body("secretary.idNumber")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("ID number too long")
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage("ID number can only contain letters, numbers, and hyphens")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

  body("treasurer")
    .optional()
    .isObject().withMessage("Treasurer must be an object"),

  body("treasurer.fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Treasurer name must be 2-100 characters")
    .matches(/^[a-zA-Z\s\-']+$/).withMessage("Name can only contain letters, spaces, hyphens, and apostrophes")
    .customSanitizer(value => sanitizeString(value, 100)),

  body("treasurer.phoneNumber")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{10,20}$/).withMessage("Invalid phone number format")
    .customSanitizer(value => sanitizePhone(value)),

  body("treasurer.email")
    .optional()
    .trim()
    .isEmail().withMessage("Valid email is required")
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),

  body("treasurer.idNumber")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("ID number too long")
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage("ID number can only contain letters, numbers, and hyphens")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

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
 * Validation middleware for adding sacco member
 */
exports.validateAddMember = [
  param("saccoId")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid sacco ID format");
      }
      return true;
    }),

  body("fullName")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters")
    .matches(/^[a-zA-Z\s\-']+$/).withMessage("Name can only contain letters, spaces, hyphens, and apostrophes")
    .customSanitizer(value => sanitizeString(value, 100)),

  body("phoneNumber")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^[0-9+\-\s()]{10,20}$/).withMessage("Invalid phone number format")
    .customSanitizer(value => sanitizePhone(value)),

  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Valid email is required")
    .normalizeEmail()
    .customSanitizer(value => sanitizeEmail(value)),

  body("idNumber")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("ID number too long")
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage("ID number can only contain letters, numbers, and hyphens")
    .customSanitizer(value => sanitizeAlphanumeric(value, 50, false)),

  body("motorbikeModel")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("Motorbike model too long")
    .matches(/^[a-zA-Z0-9\s\-]+$/).withMessage("Invalid motorbike model format")
    .customSanitizer(value => sanitizeAlphanumeric(value, 100)),

  body("motorbikeRegNumber")
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage("Registration number too long")
    .matches(/^[a-zA-Z0-9\-\s]+$/).withMessage("Invalid registration format")
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
 * Validation middleware for sacco status update
 */
exports.validateSaccoStatusUpdate = [
  param("saccoId")
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error("Invalid sacco ID format");
      }
      return true;
    }),

  body("status")
    .trim()
    .notEmpty().withMessage("Status is required")
    .isIn(["pending", "active", "suspended", "inactive"]).withMessage("Invalid status"),

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
 * Validation middleware for sacco ID parameter
 */
exports.validateSaccoId = [
  param("saccoId")
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

// Security input validation and sanitization utilities

const path = require("path");

/**
 * Clean and sanitize string input
 * - Trims whitespace
 * - Limits length
 * - Removes dangerous characters
 */
function sanitizeString(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  
  let cleaned = value.trim();
  
  // Remove null bytes (path traversal protection)
  cleaned = cleaned.replace(/\0/g, "");
  
  // Remove potential XSS vectors
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  cleaned = cleaned.replace(/javascript:/gi, "");
  cleaned = cleaned.replace(/on\w+\s*=/gi, ""); // Remove event handlers
  
  // Limit length (buffer overflow protection)
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  
  return cleaned;
}

/**
 * Sanitize email - remove dangerous characters
 */
function sanitizeEmail(email, maxLength = 254) {
  if (typeof email !== "string") return "";
  
  let cleaned = email.trim().toLowerCase();
  
  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, "");
  
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    return "";
  }
  
  // Length limit
  if (cleaned.length > maxLength) {
    return "";
  }
  
  return cleaned;
}

/**
 * Sanitize phone number - allow only digits, +, -, spaces, parentheses
 */
function sanitizePhone(phone, maxLength = 20) {
  if (typeof phone !== "string") return "";
  
  let cleaned = phone.trim();
  
  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, "");
  
  // Keep only valid phone characters
  cleaned = cleaned.replace(/[^0-9+\-\s()]/g, "");
  
  // Remove excessive spaces
  cleaned = cleaned.replace(/\s+/g, "");
  
  // Length limit
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  
  return cleaned;
}

/**
 * Sanitize alphanumeric input (for IDs, registration numbers, etc.)
 */
function sanitizeAlphanumeric(value, maxLength = 100, allowSpaces = true) {
  if (typeof value !== "string") return "";
  
  let cleaned = value.trim();
  
  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, "");
  
  // Keep only alphanumeric, spaces (if allowed), hyphens, underscores
  if (allowSpaces) {
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-_]/g, "");
  } else {
    cleaned = cleaned.replace(/[^a-zA-Z0-9\-_]/g, "");
  }
  
  // Remove excessive spaces
  cleaned = cleaned.replace(/\s+/g, " ");
  
  // Length limit
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  
  return cleaned;
}

/**
 * Sanitize file path to prevent path traversal
 */
function sanitizeFilePath(filePath) {
  if (typeof filePath !== "string") return "";
  
  // Remove null bytes
  let cleaned = filePath.replace(/\0/g, "");
  
  // Remove path traversal attempts
  cleaned = cleaned.replace(/\.\./g, "");
  cleaned = cleaned.replace(/\\/g, "/"); // Normalize to forward slashes
  
  // Get only the basename (no directory traversal)
  cleaned = path.basename(cleaned);
  
  return cleaned;
}

/**
 * Validate file upload
 * @param {Object} file - Multer file object
 * @param {Array} allowedMimeTypes - Array of allowed MIME types
 * @param {Number} maxSize - Max file size in bytes
 */
function validateFileUpload(file, allowedMimeTypes, maxSize = 10 * 1024 * 1024) {
  const errors = [];
  
  if (!file) {
    errors.push("No file provided");
    return { valid: false, errors };
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
  }
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type. Allowed: ${allowedMimeTypes.join(", ")}`);
  }
  
  // Check filename for path traversal
  if (file.originalname.includes("..") || file.originalname.includes("\0")) {
    errors.push("Invalid filename");
  }
  
  // Check file extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const validExtensions = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "application/pdf": [".pdf"],
  };
  
  const expectedExts = validExtensions[file.mimetype];
  if (expectedExts && !expectedExts.includes(ext)) {
    errors.push("File extension does not match file type");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate MongoDB ObjectId format
 */
function isValidObjectId(id) {
  if (typeof id !== "string") return false;
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Sanitize NoSQL query operators from user input
 * Prevents NoSQL injection attacks
 */
function sanitizeNoSQLInput(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    // Remove keys starting with $ or containing . (MongoDB operators)
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    
    const value = obj[key];
    
    if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeNoSQLInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Rate limit check helper
 * Returns true if rate limit exceeded
 */
const rateLimitStore = new Map();

function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const key = String(identifier);
  
  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    rateLimitStore.set(key, record);
    return false;
  }
  
  // Increment count
  record.count += 1;
  rateLimitStore.set(key, record);
  
  return record.count > maxRequests;
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeAlphanumeric,
  sanitizeFilePath,
  validateFileUpload,
  isValidObjectId,
  sanitizeNoSQLInput,
  checkRateLimit,
};

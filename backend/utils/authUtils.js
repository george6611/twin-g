const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ============================================
// 🎫 TOKEN CONFIGURATION
// ============================================

const TOKEN_CONFIG = {
  accessToken: {
    expiresIn: "15m", // 15 minutes
    expiresInSeconds: 15 * 60,
  },
  refreshToken: {
    expiresIn: "7d", // 7 days
    expiresInSeconds: 7 * 24 * 60 * 60,
  },
};

// ============================================
// 🎫 GENERATE ACCESS TOKEN
// ============================================

/**
 * Generate JWT access token with contextual payload
 * @param {Object} user - User object
 * @param {String} user.id - User ID (MongoDB _id)
 * @param {String} user.role - User role (customer, vendor, vendor_staff, rider, admin, superadmin)
 * @param {String|null} user.vendorId - Vendor ID (if vendor or vendor_staff)
 * @param {String|null} user.branchId - Branch ID (if vendor_staff)
 * @param {Array<String>} user.permissions - Array of permission strings
 * @returns {String} Signed JWT token
 */
function generateAccessToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const payload = {
    id: user.id || user._id,
    role: user.role,
    vendorId: user.vendorId ? user.vendorId.toString() : null,
    branchId: user.branchId ? user.branchId.toString() : null,
    permissions: user.permissions || [],
  };

  console.log('🎫 [generateAccessToken] Payload:', payload);

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: TOKEN_CONFIG.accessToken.expiresIn,
  });
}

// ============================================
// 🎫 GENERATE REFRESH TOKEN
// ============================================

/**
 * Generate plain refresh token (string)
 * This is sent to client, NOT stored in database
 * Only hash is stored in database for security
 * @returns {String} Plain refresh token
 */
function generateRefreshToken() {
  // Generate 32 random bytes and convert to hex
  return crypto.randomBytes(32).toString("hex");
}

// ============================================
// 🔐 HASH REFRESH TOKEN
// ============================================

/**
 * Hash refresh token for database storage
 * @param {String} token - Plain refresh token
 * @returns {String} SHA256 hash of token
 */
function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ============================================
// 🍪 SECURE COOKIE OPTIONS (WEB DASHBOARD)
// ============================================

function getAccessTokenCookieOptions() {
  const isDev = process.env.NODE_ENV !== "production";
  return {
    httpOnly: true, // 🔐 Cannot be accessed via JavaScript
    secure: process.env.NODE_ENV === "production", // 🔐 HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // 🔐 CSRF protection - lax for dev cross-origin
    maxAge: TOKEN_CONFIG.accessToken.expiresInSeconds * 1000, // 15 minutes
    path: "/", // Available site-wide
    signed: !isDev, // Don't sign in dev so Next.js middleware can read it
  };
}

function getRefreshTokenCookieOptions() {
  const isDev = process.env.NODE_ENV !== "production";
  return {
    httpOnly: true, // 🔐 Cannot be accessed via JavaScript
    secure: process.env.NODE_ENV === "production", // 🔐 HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // 🔐 CSRF protection - lax for dev
    maxAge: TOKEN_CONFIG.refreshToken.expiresInSeconds * 1000, // 7 days
    path: "/", // Available site-wide
    signed: !isDev, // Don't sign in dev so Next.js middleware can read it
  };
}

// ============================================
// 📱 MOBILE RESPONSE (APK/IOS)
// ============================================

/**
 * Format response for mobile clients
 * Mobile securely stores token in app storage
 * @param {String} accessToken - Access token
 * @param {String} refreshToken - Refresh token
 * @param {Object} user - User object
 * @returns {Object} Mobile-formatted response
 */
function formatMobileResponse(accessToken, refreshToken, user) {
  return {
    success: true,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_CONFIG.accessToken.expiresInSeconds, // Client knows when to refresh
      refreshExpiresIn: TOKEN_CONFIG.refreshToken.expiresInSeconds,
    },
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      vendorId: user.vendorId ? user.vendorId.toString() : null,
      branchId: user.branchId ? user.branchId.toString() : null,
      permissions: user.permissions || [],
    },
  };
}

// ============================================
// 🌐 WEB RESPONSE (DASHBOARD)
// ============================================

/**
 * Format response for web dashboard
 * Tokens are in HTTP-only cookies, not in response body
 * @param {Object} user - User object
 * @returns {Object} Web-formatted response (no tokens in body)
 */
function formatWebResponse(user) {
  const response = {
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      vendorId: user.vendorId ? user.vendorId.toString() : null,
      branchId: user.branchId ? user.branchId.toString() : null,
      permissions: user.permissions || [],
    },
    message: "Logged in successfully",
  };
  
  console.log('🌐 [formatWebResponse] Response user data:', {
    id: response.user.id,
    role: response.user.role,
    vendorId: response.user.vendorId,
    vendorIdType: typeof response.user.vendorId
  });
  
  return response;
}

// ============================================
// 🔐 VERIFY ACCESS TOKEN
// ============================================

/**
 * Verify and decode JWT access token
 * @param {String} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
function verifyAccessToken(token) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set");
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Token expired, invalid signature, etc.
    return null;
  }
}

// ============================================
// 🔐 EXTRACT TOKEN FROM REQUEST
// ============================================

/**
 * Extract token from request (header or cookie)
 * Priority: Bearer header > cookie
 * @param {Object} req - Express request object
 * @param {String} tokenType - "access" or "refresh"
 * @returns {String|null} Token or null if not found
 */
function extractToken(req, tokenType = "access") {
  const isDev = process.env.NODE_ENV !== "production";
  
  console.log('🔍 [extractToken] Extracting token:', {
    tokenType,
    isDev,
    hasAuthHeader: !!req.headers.authorization,
    cookies: Object.keys(req.cookies || {}),
    signedCookies: Object.keys(req.signedCookies || {}),
  });
  
  // 1️⃣ Check Bearer header (for mobile)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    console.log('✅ [extractToken] Token found in Bearer header');
    return token;
  }

  // 2️⃣ In development, cookies are unsigned - read from req.cookies
  if (isDev) {
    if (tokenType === "access" && req.cookies?.accessToken) {
      console.log('✅ [extractToken] Token found in unsigned accessToken cookie (dev)');
      return req.cookies.accessToken;
    }

    if (tokenType === "refresh" && req.cookies?.refreshToken) {
      console.log('✅ [extractToken] Token found in unsigned refreshToken cookie (dev)');
      return req.cookies.refreshToken;
    }
  }
  
  // 3️⃣ In production, cookies are signed - read from req.signedCookies
  if (!isDev) {
    if (tokenType === "access" && req.signedCookies?.accessToken) {
      console.log('✅ [extractToken] Token found in signed accessToken cookie (prod)');
      return req.signedCookies.accessToken;
    }

    if (tokenType === "refresh" && req.signedCookies?.refreshToken) {
      console.log('✅ [extractToken] Token found in signed refreshToken cookie (prod)');
      return req.signedCookies.refreshToken;
    }
  }

  console.log('❌ [extractToken] No token found');
  return null;
}

// ============================================
// 📱 DETECT CLIENT TYPE
// ============================================

/**
 * Detect if request is from web dashboard or mobile app
 * @param {Object} req - Express request object
 * @returns {String} "web" or "mobile"
 */
function detectClientType(req) {
  // If there's a Bearer token in header, it's mobile
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return "mobile";
  }

  // If there are cookies, likely web browser
  if (req.cookies && Object.keys(req.cookies).length > 0) {
    return "web";
  }

  // Check user agent for web browsers
  const userAgent = req.headers["user-agent"] || "";
  if (/mozilla|chrome|safari|firefox|edge/i.test(userAgent)) {
    return "web";
  }

  // Check if request accepts HTML (web browsers do, mobile apps typically don't)
  const accept = req.headers["accept"] || "";
  if (accept.includes("text/html")) {
    return "web";
  }

  // Default to web for development (most requests will be from browser during dev)
  return "web";
}

// ============================================
// 🛡️ VALIDATE TOKEN PAYLOAD
// ============================================

/**
 * Validate that token payload has required fields
 * @param {Object} decoded - Decoded JWT payload
 * @returns {Boolean} True if valid
 */
function isValidTokenPayload(decoded) {
  return (
    decoded &&
    decoded.id &&
    decoded.role &&
    Array.isArray(decoded.permissions)
  );
}

// ============================================
// 🚫 VALIDATE USER ROLE
// ============================================

/**
 * Check if user has required role
 * @param {String} userRole - User's role
 * @param {String|Array} requiredRoles - Required role(s)
 * @returns {Boolean}
 */
function hasRequiredRole(userRole, requiredRoles) {
  if (typeof requiredRoles === "string") {
    return userRole === requiredRoles;
  }
  return Array.isArray(requiredRoles) && requiredRoles.includes(userRole);
}

// ============================================
// 🔐 VALIDATE PERMISSION
// ============================================

/**
 * Check if user has permission
 * @param {Array} userPermissions - User's permissions array
 * @param {String|Array} requiredPermissions - Required permission(s)
 * @returns {Boolean}
 */
function hasRequiredPermission(userPermissions, requiredPermissions) {
  // Superadmin/wildcard check
  if (userPermissions.includes("*")) return true;

  if (typeof requiredPermissions === "string") {
    return userPermissions.includes(requiredPermissions);
  }

  if (Array.isArray(requiredPermissions)) {
    // All permissions required (AND logic)
    return requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );
  }

  return false;
}

// ============================================
// 📊 GET CLIENT INFO (IP, USER AGENT)
// ============================================

/**
 * Extract client information from request
 * @param {Object} req - Express request object
 * @returns {Object} Client info object
 */
function getClientInfo(req) {
  const clientType = detectClientType(req);
  const userAgent = req.headers["user-agent"] || "";
  
  // Map clientType to valid platform enum values
  let platform = "web";
  if (clientType === "mobile") {
    // Detect mobile platform from user agent
    if (/android/i.test(userAgent)) {
      platform = "android";
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      platform = "ios";
    } else {
      platform = "web"; // Fallback to web for unknown mobile platforms
    }
  } else {
    platform = "web";
  }
  
  return {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: userAgent,
    platform: platform,
  };
}

// ============================================
// 🚀 EXPORT ALL UTILITIES
// ============================================

module.exports = {
  // Configuration
  TOKEN_CONFIG,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,

  // Token generation
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,

  // Token verification
  verifyAccessToken,
  isValidTokenPayload,
  extractToken,

  // Response formatting
  formatMobileResponse,
  formatWebResponse,

  // Client detection
  detectClientType,
  getClientInfo,

  // Validation helpers
  hasRequiredRole,
  hasRequiredPermission,
};

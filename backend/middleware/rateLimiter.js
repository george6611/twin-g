const User = require("../models/User");

// ============================================
// 🚨 IN-MEMORY RATE LIMIT STORE
// ============================================
// In production, use Redis for distributed rate limiting
// For now, we'll use in-memory store (suitable for single server)

const loginAttempts = new Map(); // { ip: { count: 0, lockUntil: null } }

// ============================================
// 🚨 RATE LIMITING MIDDLEWARE FOR LOGIN
// ============================================

/**
 * Rate limit middleware for login attempts
 * Prevents: Brute force attacks, credential stuffing
 *
 * Rules:
 * - 5 failed attempts = 15 minute lockout
 * - Resets on successful login
 * - Tracked by IP address + identifier (email/phone)
 *
 * @param {Number} maxAttempts - Max attempts before lockout (default: 5)
 * @param {Number} lockoutMinutes - How many minutes to lock (default: 15)
 */
function loginRateLimiter(maxAttempts = 5, lockoutMinutes = 15) {
  return async (req, res, next) => {
    try {
      const key = `${req.ip}_${req.body.identifier}`;
      let attempts = loginAttempts.get(key);

      // Initialize if first attempt
      if (!attempts) {
        attempts = { count: 0, lockUntil: null };
        loginAttempts.set(key, attempts);
      }

      // Check if locked out
      if (attempts.lockUntil && attempts.lockUntil > Date.now()) {
        const minutes = Math.ceil(
          (attempts.lockUntil - Date.now()) / 60000
        );
        return res.status(429).json({
          success: false,
          message: `Too many login attempts. Try again in ${minutes} minutes.`,
          retryAfter: Math.ceil((attempts.lockUntil - Date.now()) / 1000),
        });
      }

      // Reset if lockout expired
      if (attempts.lockUntil && attempts.lockUntil <= Date.now()) {
        attempts.count = 0;
        attempts.lockUntil = null;
      }

      // Add middleware method for later use
      res.locals.recordLoginAttempt = () => {
        attempts.count += 1;

        if (attempts.count >= maxAttempts) {
          attempts.lockUntil = Date.now() + lockoutMinutes * 60 * 1000;
          console.warn(
            `🚨 Login lockout for ${key} - ${maxAttempts} attempts exceeded`
          );
        }

        loginAttempts.set(key, attempts);
      };

      res.locals.resetLoginAttempts = () => {
        loginAttempts.delete(key);
      };

      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      res.status(500).json({ success: false, message: "Rate limiter error" });
    }
  };
}

// ============================================
// ⏰ IP-BASED RATE LIMITING (General API calls)
// ============================================

/**
 * General IP-based rate limiter for API endpoints
 * Prevents: DDoS attacks, API abuse
 *
 * @param {Number} limit - Requests per window (default: 100)
 * @param {Number} windowMinutes - Time window in minutes (default: 15 min)
 */
function ipRateLimiter(limit = 100, windowMinutes = 15) {
  const store = new Map(); // { ip: { count: 0, resetAt: timestamp } }

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    let record = store.get(ip);

    // Initialize or reset if window expired
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMinutes * 60 * 1000 };
    }

    // Increment counter
    record.count += 1;
    store.set(ip, record);

    // Add rate limit info to response headers
    res.set({
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": Math.max(0, limit - record.count),
      "X-RateLimit-Reset": record.resetAt,
    });

    // Check limit
    if (record.count > limit) {
      const resets = record.resetAt - now;
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait before trying again.",
        retryAfter: Math.ceil(resets / 1000),
      });
    }

    next();
  };
}

// ============================================
// 🔐 PER-USER RATE LIMITING (e.g., POST requests)
// ============================================

/**
 * Rate limit by user ID (for authenticated endpoints)
 * Prevents: Spam submissions, resource abuse
 *
 * @param {Number} limit - Requests per user per window (default: 30)
 * @param {Number} windowMinutes - Time window (default: 1 min)
 */
function userRateLimiter(limit = 30, windowMinutes = 1) {
  const store = new Map(); // { userId: { count: 0, resetAt: timestamp } }

  return (req, res, next) => {
    // Only apply to authenticated requests
    if (!req.user || !req.user.id) {
      return next();
    }

    const userId = req.user.id.toString();
    const now = Date.now();

    let record = store.get(userId);

    // Initialize or reset if window expired
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMinutes * 60 * 1000 };
    }

    // Increment counter
    record.count += 1;
    store.set(userId, record);

    // Check limit
    if (record.count > limit) {
      const resets = record.resetAt - now;
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please wait before trying again.",
        retryAfter: Math.ceil(resets / 1000),
      });
    }

    next();
  };
}

// ============================================
// 🧹 CLEANUP EXPIRED RECORDS (Run periodically)
// ============================================

/**
 * Clean up expired rate limit records
 * Call this periodically (e.g., every hour)
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of loginAttempts.entries()) {
    if (!record.lockUntil || record.lockUntil <= now) {
      loginAttempts.delete(key);
      cleaned++;
    }
  }

  console.log(`✅ Rate limit cleanup: Removed ${cleaned} expired records`);
}

// Setup periodic cleanup (every hour)
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);

// ============================================
// 🚀 EXPORT MIDDLEWARE
// ============================================

module.exports = {
  loginRateLimiter,
  ipRateLimiter,
  userRateLimiter,
  cleanupRateLimitStore,
};

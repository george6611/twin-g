const express = require("express");
const router = express.Router();
const { loginRateLimiter } = require("../../middleware/rateLimiter");
const { protect, restrictAccountType } = require("../../middleware/rbac");
const {
  login,
  refresh,
  logout,
  getActiveSessions,
  revokeSession,
  verifyToken,
  getCurrentUser,
} = require("../../controllers/auth/unified");

// ============================================
// 🔐 AUTH ROUTES
// ============================================

/**
 * POST /api/auth/login
 * Unified login for all roles (web + mobile)
 * Rate limited: 5 attempts per 15 minutes
 */
router.post("/login", loginRateLimiter(5, 15), login);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Mobile: Send refreshToken in body
 * Web: Refresh token comes from cookie automatically
 */
router.post("/refresh", refresh);

/**
 * POST /api/auth/logout
 * Logout current user
 * Requires: Authentication (protect middleware)
 *
 * Body (optional):
 * {
 *   revokeAll: true // Revoke ALL sessions (default: false)
 * }
 */
router.post("/logout", protect, logout);

/**
 * GET /api/auth/verify
 * Verify and decode current token
 * Requires: Authentication
 * Returns decoded payload + user info
 */
router.get("/verify", protect, verifyToken);

/**
 * GET /api/auth/me
 * Get current authenticated user info
 * Requires: Authentication
 * Returns: Full user profile with vendorId/branchId
 */
router.get("/me", protect, getCurrentUser);

/**
 * GET /api/auth/sessions
 * Get active sessions for current user
 * Requires: Authentication
 */
router.get("/sessions", protect, getActiveSessions);

/**
 * POST /api/auth/sessions/:sessionId/revoke
 * Revoke a specific user session
 * Requires: Admin role
 */
router.post("/sessions/:sessionId/revoke", protect, revokeSession);

module.exports = router;

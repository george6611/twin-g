const User = require("../../models/User");
const RefreshToken = require("../../models/RefreshToken");
const Customer = require("../../models/Customer");
const Vendor = require("../../models/Vendor");
const Rider = require("../../models/Rider");
const Staff = require("../../models/Staff");

const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  formatMobileResponse,
  formatWebResponse,
  detectClientType,
  getClientInfo,
} = require("../../utils/authUtils");

// ============================================
// 🔐 UNIFIED LOGIN ENDPOINT
// ============================================

/**
 * POST /api/auth/login
 * Unified login for all roles (customer, vendor, rider, admin, superadmin)
 *
 * Request body:
 * {
 *   identifier: "phone or email",
 *   password: "password"
 * }
 *
 * Response: Different for web vs mobile
 * - Web: Tokens in HTTP-only cookies, user info in body
 * - Mobile: Both tokens and user info in body
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // ============================================
    // 1️⃣ VALIDATE INPUT
    // ============================================

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone/email and password are required",
      });
    }

    // ============================================
    // 2️⃣ FIND USER
    // ============================================
    // 2️⃣ FIND USER (with password for comparison)
    // ============================================

    const user = await User.findOne({
      $or: [{ phone: identifier.trim() }, { email: identifier.trim() }],
    }).select('+password'); // Must explicitly select password since it's excluded by default

    console.log('🔐 [LOGIN] User found:', {
      id: user?._id,
      name: user?.name,
      role: user?.role,
      vendorId: user?.vendorId,
      vendorIdString: user?.vendorId?.toString(),
      hasPassword: !!user?.password
    });

    if (!user) {
      // Record failed attempt
      res.locals.recordLoginAttempt?.();

      return res.status(400).json({
        success: false,
        message: "Account not found",
      });
    }

    // ============================================
    // 3️⃣ CHECK ACCOUNT LOCKED
    // ============================================

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: "Account locked due to too many failed login attempts. Try again later.",
      });
    }

    // ============================================
    // 4️⃣ CHECK ACCOUNT ACTIVE
    // ============================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled. Contact support.",
      });
    }

    // ============================================
    // 5️⃣ VERIFY PASSWORD
    // ============================================

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      // Record failed attempt and potentially lock account
      await user.incLoginAttempts();
      res.locals.recordLoginAttempt?.();

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ============================================
    // 6️⃣ SUCCESS - RESET LOGIN ATTEMPTS
    // ============================================

    await user.resetLoginAttempts();
    res.locals.resetLoginAttempts?.();

    // ============================================
    // 7️⃣ MARK LOGIN & UPDATE TIMESTAMPS
    // ============================================

    const clientInfo = getClientInfo(req);
    await user.markLogin(clientInfo.ip, clientInfo.userAgent);

    // ============================================
    // 8️⃣ GENERATE TOKENS
    // ============================================

    // Generate access token (short-lived)
    const accessToken = generateAccessToken(user);

    // Generate refresh token (long-lived)
    const refreshTokenPlain = generateRefreshToken();
    const refreshTokenDoc = await RefreshToken.createToken(
      user._id,
      refreshTokenPlain,
      clientInfo
    );

    // ============================================
    // 9.5️⃣ Ensure vendor context exists for vendor/vendor_staff
    // ============================================
    if ((user.role === "vendor" || user.role === "vendor_staff") && !user.vendorId) {
      if (user.role === "vendor") {
        const vendorProfile = await Vendor.findOne({ userId: user._id }).select("_id");
        if (vendorProfile?._id) {
          user.vendorId = vendorProfile._id;
          await user.save();
        }
      }

      if (user.role === "vendor_staff") {
        const staffProfile = await Staff.findOne({ userId: user._id }).select("vendorId branchId");
        if (staffProfile?.vendorId) {
          user.vendorId = staffProfile.vendorId;
          if (!user.branchId && staffProfile.branchId) {
            user.branchId = staffProfile.branchId;
          }
          await user.save();
        }
      }
    }

    // ============================================
    // 9️⃣ DETECT CLIENT TYPE
    // ============================================

    const clientType = detectClientType(req);
    
    console.log('🌐 [LOGIN] Client type detected:', clientType);

    // ============================================
    // 🔟 SET RESPONSE BASED ON CLIENT
    // ============================================

    if (clientType === "web") {
      // 🌐 WEB DASHBOARD: Tokens in HTTP-only cookies
      const cookieOptions = getAccessTokenCookieOptions();
      console.log('🍪 [LOGIN] Setting cookies with options:', cookieOptions);
      
      res.cookie(
        "accessToken",
        accessToken,
        cookieOptions
      );
      res.cookie(
        "refreshToken",
        refreshTokenPlain,
        getRefreshTokenCookieOptions()
      );
      
      console.log('✅ [LOGIN] Cookies set successfully');

      return res.json(formatWebResponse(user));
    } else {
      // 📱 MOBILE APP: Tokens in response body
      return res.json(
        formatMobileResponse(accessToken, refreshTokenPlain, user)
      );
    }
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ============================================
// 🔄 REFRESH TOKEN ENDPOINT
// ============================================

/**
 * POST /api/auth/refresh
 * Rotate refresh token and issue new access token
 *
 * Request: Sends either:
 * - Refresh token in cookie (web)
 * - Refresh token in body (mobile)
 *
 * Response:
 * - Web: New tokens in cookies
 * - Mobile: New tokens in body
 */
const refresh = async (req, res) => {
  try {
    // ============================================
    // 1️⃣ EXTRACT REFRESH TOKEN
    // ============================================

    let refreshTokenPlain = null;

    // Mobile sends refresh token in body
    if (req.body.refreshToken) {
      refreshTokenPlain = req.body.refreshToken;
    }
    // Web sends in cookie
    else if (req.cookies.refreshToken) {
      refreshTokenPlain = req.cookies.refreshToken;
    }

    if (!refreshTokenPlain) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // ============================================
    // 2️⃣ VERIFY REFRESH TOKEN
    // ============================================

    // First, find user from JWT (if available)
    let userId = null;

    if (req.user && req.user.id) {
      userId = req.user.id;
    } else if (req.token && req.token.id) {
      userId = req.token.id;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User context is required",
      });
    }

    // Verify the refresh token
    const refreshTokenDoc = await RefreshToken.verifyToken(
      userId,
      refreshTokenPlain
    );

    if (!refreshTokenDoc) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired",
      });
    }

    // ============================================
    // 3️⃣ FETCH USER
    // ============================================

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account disabled",
      });
    }

    // ============================================
    // 4️⃣ GENERATE NEW TOKENS
    // ============================================

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    // Rotate refresh token
    const newRefreshTokenPlain = generateRefreshToken();
    const newRefreshTokenDoc = await RefreshToken.rotateToken(
      refreshTokenDoc._id,
      userId,
      newRefreshTokenPlain
    );

    // ============================================
    // 5️⃣ DETECT CLIENT & RESPOND
    // ============================================

    const clientType = detectClientType(req);

    if (clientType === "web") {
      // Web: Tokens in cookies
      res.cookie(
        "accessToken",
        newAccessToken,
        getAccessTokenCookieOptions()
      );
      res.cookie(
        "refreshToken",
        newRefreshTokenPlain,
        getRefreshTokenCookieOptions()
      );

      return res.json({
        success: true,
        message: "Token refreshed successfully",
      });
    } else {
      // Mobile: Tokens in body
      return res.json(
        formatMobileResponse(newAccessToken, newRefreshTokenPlain, user)
      );
    }
  } catch (error) {
    console.error("❌ Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Error refreshing token",
    });
  }
};

// ============================================
// 🚪 LOGOUT ENDPOINT
// ============================================

/**
 * POST /api/auth/logout
 * Revoke refresh token and clear cookies
 *
 * Supported options:
 * - revokeAll: true - Revoke ALL refresh tokens for user
 * - revokeSessionOnly: false - Revoke only current session
 */
const logout = async (req, res) => {
  try {
    // ============================================
    // 1️⃣ VERIFY AUTHENTICATION
    // ============================================

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const userId = req.user.id;
    const { revokeAll = false } = req.body;

    // ============================================
    // 2️⃣ REVOKE TOKEN(S)
    // ============================================

    if (revokeAll) {
      // Revoke ALL refresh tokens (e.g., on password change)
      await RefreshToken.revokeAllUserTokens(
        userId,
        "logout_all_sessions"
      );
    } else {
      // Revoke current refresh token only
      if (req.cookies.refreshToken) {
        const refreshTokenHash = require("crypto")
          .createHash("sha256")
          .update(req.cookies.refreshToken)
          .digest("hex");

        const refreshTokenDoc = await RefreshToken.findOne({
          userId,
          tokenHash: refreshTokenHash,
        });

        if (refreshTokenDoc) {
          await RefreshToken.revokeToken(refreshTokenDoc._id, "user_logout");
        }
      }
    }

    // ============================================
    // 3️⃣ CLEAR COOKIES (FOR WEB)
    // ============================================

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // ============================================
    // 4️⃣ RESPOND
    // ============================================

    res.json({
      success: true,
      message: revokeAll
        ? "Logged out from all devices"
        : "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
};

// ============================================
// 📱 GET ACTIVE SESSIONS
// ============================================

/**
 * GET /api/auth/sessions
 * Get list of active sessions for current user
 * Useful for "Manage My Sessions" feature
 */
const getActiveSessions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const sessions = await RefreshToken.getActiveSessions(req.user.id);

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id,
        device: session.deviceInfo?.platform,
        ip: session.deviceInfo?.ipAddress,
        location: session.location?.city,
        lastActive: session.usedAt,
        createdAt: session.createdAt,
      })),
    });
  } catch (error) {
    console.error("❌ Get sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
    });
  }
};

// ============================================
// 🚪 REVOKE SESSION (ADMIN ONLY)
// ============================================

/**
 * POST /api/auth/sessions/:sessionId/revoke
 * Revoke a specific session
 * Admin-only endpoint
 */
const revokeSession = async (req, res) => {
  try {
    if (!req.user || !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    await RefreshToken.revokeToken(sessionId, "admin_revoke");

    res.json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("❌ Revoke session error:", error);
    res.status(500).json({
      success: false,
      message: "Error revoking session",
    });
  }
};

// ============================================
// 🔐 VERIFY TOKEN (FOR VALIDATION)
// ============================================

/**
 * GET /api/auth/verify
 * Check if current token is valid
 * Return decoded token payload
 */
const verifyToken = async (req, res) => {
  try {
    if (!req.user || !req.token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    res.json({
      success: true,
      valid: true,
      token: {
        id: req.token.id,
        role: req.token.role,
        vendorId: req.token.vendorId,
        branchId: req.token.branchId,
        permissions: req.token.permissions,
      },
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("❌ Verify token error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying token",
    });
  }
};

// ============================================
// � GET CURRENT USER (/api/auth/me)
// ============================================

/**
 * GET /api/auth/me
 * Get current authenticated user info
 * 
 * Requires: protect middleware
 * Returns: User profile with vendorId/branchId
 */
const getCurrentUser = async (req, res) => {
  try {
    console.log('👤 [GET /api/auth/me] Request from user:', req.user?._id);
    
    // Get full user from database
    const User = require("../../models/User");
    const user = await User.findById(req.user?._id || req.user?.userId);
    
    if (!user) {
      console.log('❌ [GET /api/auth/me] User not found');
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    
    console.log('✅ [GET /api/auth/me] User found:', {
      id: user._id,
      role: user.role,
      vendorId: user.vendorId,
      vendorIdString: user.vendorId?.toString()
    });

    if ((user.role === "vendor" || user.role === "vendor_staff") && !user.vendorId) {
      if (user.role === "vendor") {
        const vendorProfile = await Vendor.findOne({ userId: user._id }).select("_id");
        if (vendorProfile?._id) {
          user.vendorId = vendorProfile._id;
          await user.save();
        }
      }

      if (user.role === "vendor_staff") {
        const staffProfile = await Staff.findOne({ userId: user._id }).select("vendorId branchId");
        if (staffProfile?.vendorId) {
          user.vendorId = staffProfile.vendorId;
          if (!user.branchId && staffProfile.branchId) {
            user.branchId = staffProfile.branchId;
          }
          await user.save();
        }
      }
    }
    
    // Return formatted response (same as login)
    return res.json(formatWebResponse(user));
  } catch (error) {
    console.error("❌ Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user info",
    });
  }
};

// ============================================
// 🚀 EXPORT CONTROLLER
// ============================================

module.exports = {
  login,
  refresh,
  logout,
  getActiveSessions,
  revokeSession,
  verifyToken,
  getCurrentUser,
};

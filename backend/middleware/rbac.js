const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { extractToken, verifyAccessToken, detectClientType } = require("../utils/authUtils");

// ============================================
// 🔐 UNIFIED AUTH MIDDLEWARE (FOR ALL ROUTES)
// ============================================

/**
 * Verify JWT and attach user to req.user
 * Support both Bearer tokens (mobile) and cookies (web)
 */
async function protect(req, res, next) {
  try {
    console.log('🔐 [protect] Checking authentication for:', req.path);
    console.log('🍪 [protect] Cookies received:', Object.keys(req.cookies || {}));
    console.log('📝 [protect] Signed cookies:', Object.keys(req.signedCookies || {}));
    
    const token = extractToken(req, "access");

    console.log('🎫 [protect] Token extracted:', token ? 'YES' : 'NO');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please login.",
      });
    }

    // Decode and verify token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Token expired or invalid. Please login again.",
      });
    }

    // Fetch user and attach to request
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account disabled.",
      });
    }

    // Attach to request for use in subsequent middleware
    req.user = user;
    req.token = decoded; // Store decoded token separately

    // Detect client type (web or mobile)
    req.clientType = detectClientType(req);

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}

// ============================================
// 🔐 AUTHORIZE BY ROLE
// ============================================

/**
 * Middleware to check if user has required role(s)
 * @param {String|Array} allowedRoles - Role(s) to allow
 *
 * Usage:
 *   router.post("/", protect, authorizeRole(["admin", "vendor"]), controller);
 */
function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

// ============================================
// 🔐 AUTHORIZE BY PERMISSION
// ============================================

/**
 * Middleware to check if user has required permission(s)
 * @param {String|Array} requiredPermissions - Permission(s) to check
 * @param {String} logic - "AND" (all required) or "OR" (any)
 *
 * Usage:
 *   router.post("/", protect, authorizePermission("edit_orders"), controller);
 *   router.post("/", protect, authorizePermission(["view_orders", "edit_orders"], "OR"), controller);
 */
function authorizePermission(requiredPermissions, logic = "AND") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Superadmin wildcard check
    if (req.user.permissions.includes("*")) {
      return next();
    }

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    let hasPermission = false;

    if (logic === "AND") {
      // User must have ALL permissions
      hasPermission = permissions.every((perm) =>
        req.user.permissions.includes(perm)
      );
    } else if (logic === "OR") {
      // User must have ANY permission
      hasPermission = permissions.some((perm) =>
        req.user.permissions.includes(perm)
      );
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission(s): ${permissions.join(", ")}. Your permissions: ${req.user.permissions.join(", ")}`,
      });
    }

    next();
  };
}

// ============================================
// 🔐 AUTHORIZE BY VENDOR OWNERSHIP
// ============================================

/**
 * Middleware to check if user owns vendor
 * Allows: vendor owner, superadmin, admin
 *
 * Usage:
 *   router.get("/:vendorId/orders", protect, authorizeVendorOwnership, controller);
 *
 * Expects: req.params.vendorId
 */
function authorizeVendorOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  const vendorId = req.params.vendorId;

  if (!vendorId) {
    return res.status(400).json({
      success: false,
      message: "vendorId is required",
    });
  }

  // Check if user owns vendor or is admin
  if (req.user.role === "superadmin" || req.user.role === "admin") {
    return next(); // Admins can access any vendor
  }

  if (req.user.role === "vendor" || req.user.role === "vendor_staff") {
    if (req.user.vendorId && req.user.vendorId.toString() === vendorId) {
      return next(); // User owns this vendor
    }
  }

  res.status(403).json({
    success: false,
    message: "You do not have permission to access this vendor.",
  });
}

// ============================================
// 🔐 AUTHORIZE BY BRANCH OWNERSHIP
// ============================================

/**
 * Middleware to check if user owns branch
 * Allows: branch owner (vendor_staff), main vendor, admin, superadmin
 *
 * Usage:
 *   router.get("/:branchId/orders", protect, authorizeBranchOwnership, controller);
 *
 * Expects: req.params.branchId
 */
function authorizeBranchOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  const branchId = req.params.branchId;

  if (!branchId) {
    return res.status(400).json({
      success: false,
      message: "branchId is required",
    });
  }

  // Admins can access any branch
  if (req.user.role === "superadmin" || req.user.role === "admin") {
    return next();
  }

  // Vendor can access any branch within their vendor
  if (req.user.role === "vendor") {
    req.branchScope = null; // No restriction for main vendor
    return next();
  }

  // Vendor_staff can only access assigned branch
  if (req.user.role === "vendor_staff") {
    if (req.user.branchId && req.user.branchId.toString() === branchId) {
      req.branchScope = branchId;
      return next();
    }
  }

  res.status(403).json({
    success: false,
    message: "You do not have permission to access this branch.",
  });
}

// ============================================
// 🔐 ENFORCE VENDOR SCOPE (For vendor_staff)
// ============================================

/**
 * Middleware to enforce vendor scope for vendor_staff users
 * Restricts vendor_staff to their assigned vendor
 *
 * Usage:
 *   router.use("/", protect, enforceVendorScope);
 */
function enforceVendorScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  // For vendor_staff, override vendor ID
  if (req.user.role === "vendor_staff") {
    req.params.vendorId = req.user.vendorId;
  }

  next();
}

// ============================================
// 🔐 ENFORCE BRANCH SCOPE (For vendor_staff)
// ============================================

/**
 * Middleware to enforce branch scope for vendor_staff users
 * Restricts vendor_staff to their assigned branch
 *
 * Usage:
 *   router.use("/", protect, enforceBranchScope);
 */
function enforceBranchScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  // For vendor_staff, override branch ID
  if (req.user.role === "vendor_staff") {
    req.params.branchId = req.user.branchId;
    req.query.branchId = req.user.branchId; // Also override query params
  }

  next();
}

// ============================================
// 🔐 VERIFY RESOURCE OWNERSHIP
// ============================================

/**
 * Middleware to verify that user owns a specific resource
 * @param {Function} ownershipCheck - Function that checks ownership
 *                                   Receives (req, resourceId) and returns true/false
 *
 * Usage:
 *   router.patch("/:orderId", protect, verifyOwnership(async (req, id) => {
 *     const order = await Order.findById(id);
 *     return order.vendorId.toString() === req.user.vendorId.toString();
 *   }), controller);
 */
function verifyOwnership(ownershipCheck) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Admins bypass ownership check
    if (req.user.role === "superadmin" || req.user.role === "admin") {
      return next();
    }

    const resourceId = req.params.id || req.params.resourceId;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Resource ID is required",
      });
    }

    try {
      const owns = await ownershipCheck(req, resourceId);

      if (!owns) {
        return res.status(403).json({
          success: false,
          message: "You do not own this resource.",
        });
      }

      next();
    } catch (error) {
      console.error("Ownership verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying resource ownership",
      });
    }
  };
}

// ============================================
// 🔐 RESTRICT CLIENT TYPE
// ============================================

/**
 * Middleware to restrict access based on client type (web vs mobile)
 *
 * Usage:
 *   router.post("/", protect, restrictToClient("web"), controller);
 *   router.post("/", protect, restrictToClient(["ios", "android"]), controller);
 */
function restrictToClient(allowedClients) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const clients = Array.isArray(allowedClients)
      ? allowedClients
      : [allowedClients];

    if (!clients.includes(req.clientType)) {
      return res.status(403).json({
        success: false,
        message: `This endpoint is not available on ${req.clientType}. Allowed: ${clients.join(", ")}`,
      });
    }

    next();
  };
}

// ============================================
// 🔐 RESTRICT ACCOUNT TYPE (Mobile vs Dashboard)
// ============================================

/**
 * Middleware to prevent account type mixing
 * Example: Prevent customer from accessing vendor dashboard
 *
 * Usage:
 *   router.use("/api/vendor/*", protect, restrictAccountType({
 *     client: "web",
 *     deniedRoles: ["customer", "rider"]
 *   }));
 */
function restrictAccountType(options = {}) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { client = "web", deniedRoles = [] } = options;

    if (client === "web" && deniedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${req.user.role} accounts cannot access web dashboard. Use mobile app instead.`,
      });
    }

    next();
  };
}

// ============================================
// 🚀 EXPORT MIDDLEWARE
// ============================================

module.exports = {
  // Core auth
  protect,

  // Role-based
  authorizeRole,

  // Permission-based
  authorizePermission,

  // Ownership-based
  authorizeVendorOwnership,
  authorizeBranchOwnership,
  verifyOwnership,

  // Scope enforcement
  enforceVendorScope,
  enforceBranchScope,

  // Client restrictions
  restrictToClient,
  restrictAccountType,
};

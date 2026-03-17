// middleware/auth.js
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const Vendor = require("../models/Vendor");
const Rider = require("../models/Rider");

/**
 * Unified Authentication Middleware
 * Supports: customer, vendor, rider
 */
const protect = async (req, res, next) => {
  let token;

  console.log(`🔐 [PROTECT] ${req.method} ${req.path}`);

  // 1️⃣ Extract Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("🔐 [PROTECT] Bearer token found");
  }

  if (!token) {
    console.log("🔐 [PROTECT] No token found, checking for cookies...");
    // Try to get from cookies
    token =
      req.cookies?.accessToken ||
      req.signedCookies?.accessToken ||
      req.cookies?.authToken ||
      req.cookies?.token ||
      req.cookies?.session_token;
    if (token) console.log("🔐 [PROTECT] Token found in cookie");
  }

  if (!token) {
    console.log("❌ [PROTECT] No token found");
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.warn("⚠️ JWT_SECRET is not defined");
    }

    // 2️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // JWT is signed with { userId, role }, so use decoded.userId
    const userId = decoded.userId || decoded.id;
    const { role } = decoded;
    console.log("🔐 [PROTECT] JWT verified, role:", role, "userId:", userId);

    // 3️⃣ Determine model based on role
    const models = { customer: Customer, vendor: Vendor, rider: Rider };
    const Model = models[role];

    if (!Model) {
      return res.status(401).json({ message: "Invalid role in token" });
    }

    // 4️⃣ Fetch user from correct role model
    let user = await Model.findOne({ userId }).select("-password");
    
    // If user doesn't exist in role model, create it (for first-time login)
    if (!user) {
      console.warn(`⚠️ ${role} profile not found for userId ${userId}, creating one...`);
      
      // Get base user info from User model
      const User = require("../models/User");
      const baseUser = await User.findById(userId);
      
      if (!baseUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create role-specific profile
      if (role === "customer") {
        user = new Customer({ userId, name: baseUser.name, email: baseUser.email, phone: baseUser.phone });
      } else if (role === "vendor") {
        user = new Vendor({ userId, name: baseUser.name, email: baseUser.email, phone: baseUser.phone });
      } else if (role === "rider") {
        user = new Rider({ userId, name: baseUser.name, email: baseUser.email, phone: baseUser.phone });
      }
      
      await user.save();
      console.log(`✅ ${role} profile created for userId ${userId}`);
    }

    // 5️⃣ Attach user & role to request
    const normalizedUser = { ...user.toObject(), role, userId };

    // Normalize vendor identity for downstream ownership checks
    if (role === "vendor" && !normalizedUser.vendorId) {
      normalizedUser.vendorId = normalizedUser._id;
    }

    req.user = normalizedUser;
    req.userType = role; // optional alias

    next();
  } catch (err) {
    console.error("Auth Error:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

/**
 * Role-based access control middleware
 * Usage: authorizeRoles("vendor", "customer")
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log(`👤 [AUTHORIZE ROLES] Required: ${allowedRoles.join(", ")}, User role: ${req.user?.role}`);
    
    if (!req.user) {
      console.log("❌ [AUTHORIZE ROLES] No user");
      return res.status(403).json({ message: "Forbidden: no user" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ [AUTHORIZE ROLES] Role ${req.user.role} not allowed`);
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    
    console.log(`✅ [AUTHORIZE ROLES] Access granted`);
    next();
  };
};

module.exports = { protect, authorizeRoles };

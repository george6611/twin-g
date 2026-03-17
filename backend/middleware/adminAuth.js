const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ADMIN_ROLES = ["admin", "superadmin"];

const protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    token = req.cookies?.authToken || req.cookies?.token || req.cookies?.session_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Admin user not found" });
    }

    if (!ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    req.user = { ...user.toObject(), userId: user._id, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, token invalid" });
  }
};

module.exports = { protectAdmin };

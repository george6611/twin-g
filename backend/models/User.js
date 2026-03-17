const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// ============================================
// 🔐 CONFIG CONSTANTS
// ============================================
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

const userSchema = new mongoose.Schema(
  {
    // 👤 Basic Info
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    profileImage: { type: String },

    // 🔑 Role & Permissions
    role: {
      type: String,
      enum: ["customer", "vendor", "rider", "vendor_staff", "admin", "superadmin"],
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },

    // 🏢 Organization
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },

    // 📋 Related Entities
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },

    // 🔐 Security
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    // 🔄 Refresh Token
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpire: { type: Date, default: null },

    // 📱 Device Tokens
    deviceToken: [
      {
        token: String,
        platform: { type: String, enum: ["ios", "android", "web"] },
        lastUsed: { type: Date, default: Date.now },
      },
    ],

    // 📊 Audit
    lastLogin: { type: Date, default: null },
    lastSeen: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  { timestamps: true }
);

// ============================================
// 🔐 INDEXES
// ============================================
userSchema.index({ vendorId: 1, role: 1 });
userSchema.index({ branchId: 1, role: 1 });
userSchema.index({ lastLogin: -1 });

// ============================================
// 🔐 VIRTUAL: isLocked
// ============================================
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ============================================
// 🔐 HIDE SENSITIVE FIELDS
// ============================================
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// ============================================
// 🔐 HASH PASSWORD
// ============================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ============================================
// 🔐 COMPARE PASSWORD
// ============================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ============================================
// 🚨 INCREMENT LOGIN ATTEMPTS
// ============================================
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

// ============================================
// 🟢 RESET LOGIN ATTEMPTS
// ============================================
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// ============================================
// 🎫 MARK LOGIN SUCCESS
// ============================================
userSchema.methods.markLogin = async function (ip) {
  this.lastLogin = new Date();
  this.lastSeen = new Date();
  this.lastLoginIp = ip;
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

// ============================================
// 🔐 REFRESH TOKEN GENERATION
// ============================================
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = crypto.randomBytes(40).toString("hex");

  this.refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  this.refreshTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  return refreshToken;
};

// ============================================
// ✅ OWNERSHIP CHECKS
// ============================================
userSchema.methods.ownsBranch = function (branchId) {
  if (this.role === "vendor") return true;
  if (this.role === "vendor_staff") {
    return this.branchId?.toString() === branchId.toString();
  }
  return false;
};

userSchema.methods.ownsVendor = function (vendorId) {
  if (["superadmin", "admin"].includes(this.role)) return true;
  return this.vendorId?.toString() === vendorId.toString();
};

// ============================================
// ✅ PERMISSION CHECK
// ============================================
userSchema.methods.hasPermission = function (permission) {
  if (this.permissions.includes("*")) return true;
  return this.permissions.includes(permission);
};

// ============================================
// ✅ ROLE CHECK
// ============================================
userSchema.methods.hasRole = function (roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(this.role);
};

module.exports = mongoose.model("User", userSchema);
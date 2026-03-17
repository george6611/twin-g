const mongoose = require("mongoose");
const crypto = require("crypto");

const refreshTokenSchema = new mongoose.Schema(
  {
    // 🔑 User Reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔐 Token Hash (NEVER store plain token in database)
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    // ⏰ Expiration
    expiresAt: {
      type: Date,
      required: true,
      // TTL index - MongoDB will auto-delete expired documents after 7 days
      index: { expireAfterSeconds: 0 },
    },

    // 📱 Device & Browser Info (for session tracking)
    deviceInfo: {
      platform: { type: String, enum: ["web", "ios", "android"], default: "web" },
      userAgent: String,
      ipAddress: String,
      deviceId: String, // Unique device identifier for mobile
    },

    // 🌍 Geographic Info
    location: {
      latitude: Number,
      longitude: Number,
      city: String,
    },

    // ✅ Revocation
    isRevoked: { type: Boolean, default: false },
    revokedAt: Date,
    revokeReason: String, // e.g., "user_logout", "password_change", "admin_revoke", "security_breach"

    // 🔄 Usage Tracking
    usedAt: { type: Date, default: null },
    usedCount: { type: Number, default: 0 },
    lastUsedIp: String,

    // 🎫 Rotation Info (for token rotation on refresh)
    rotatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshToken",
      default: null,
    },
    rotatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshToken",
      default: null,
    },
  },
  { timestamps: true }
);

// ============================================
// 🔐 INDEXES FOR PERFORMANCE
// ============================================
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ tokenHash: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ isRevoked: 1 });
refreshTokenSchema.index({ createdAt: 1 });

// ============================================
// 🔐 STATIC METHODS
// ============================================

/**
 * Create a new refresh token
 * @param {ObjectId} userId - User ID
 * @param {String} token - Plain token to hash
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Object>} Saved refresh token document
 */
refreshTokenSchema.statics.createToken = async function (userId, token, deviceInfo = {}) {
  // Hash the token
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Calculate expiration (7 days from now)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const refreshToken = new this({
    userId,
    tokenHash,
    expiresAt,
    deviceInfo: {
      platform: deviceInfo.platform || "web",
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
      deviceId: deviceInfo.deviceId,
    },
    location: deviceInfo.location,
  });

  return refreshToken.save();
};

/**
 * Verify refresh token validity
 * @param {ObjectId} userId - User ID
 * @param {String} token - Plain token to verify
 * @returns {Promise<Object|null>} Refresh token document or null if invalid
 */
refreshTokenSchema.statics.verifyToken = async function (userId, token) {
  // Hash the token
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find non-revoked token
  const refreshToken = await this.findOne({
    userId,
    tokenHash,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!refreshToken) return null;

  // Update usage
  refreshToken.usedAt = new Date();
  refreshToken.usedCount = (refreshToken.usedCount || 0) + 1;
  await refreshToken.save();

  return refreshToken;
};

/**
 * Revoke a refresh token
 * @param {ObjectId} tokenId - Refresh token ID
 * @param {String} reason - Reason for revocation
 * @returns {Promise<void>}
 */
refreshTokenSchema.statics.revokeToken = async function (tokenId, reason = "user_logout") {
  await this.updateOne(
    { _id: tokenId },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    }
  );
};

/**
 * Revoke all user tokens (e.g., password change, security breach)
 * @param {ObjectId} userId - User ID
 * @param {String} reason - Reason for revocation
 * @returns {Promise<void>}
 */
refreshTokenSchema.statics.revokeAllUserTokens = async function (
  userId,
  reason = "user_initiated"
) {
  await this.updateMany(
    { userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: reason,
      },
    }
  );
};

/**
 * Rotate refresh token (used during token refresh)
 * @param {ObjectId} oldTokenId - Old refresh token ID
 * @param {ObjectId} userId - User ID
 * @param {String} newToken - New plain token
 * @returns {Promise<Object>} New refresh token document
 */
refreshTokenSchema.statics.rotateToken = async function (
  oldTokenId,
  userId,
  newToken
) {
  // Create new token
  const newRefreshToken = await this.createToken(userId, newToken);

  // Revoke old token and set rotation info
  await this.updateOne(
    { _id: oldTokenId },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: "token_rotated",
        rotatedTo: newRefreshToken._id,
      },
    }
  );

  // Link new token back to old
  await this.updateOne(
    { _id: newRefreshToken._id },
    { $set: { rotatedFrom: oldTokenId } }
  );

  return newRefreshToken;
};

/**
 * Clean up old revoked tokens (run as cron job)
 * @returns {Promise<Object>} DeleteResult object
 */
refreshTokenSchema.statics.cleanupOldTokens = async function () {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } }, // Expired tokens
      {
        isRevoked: true,
        revokedAt: { $lt: thirtyDaysAgo },
      }, // Old revoked tokens
    ],
  });
};

/**
 * Get active sessions for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Array>} Array of active sessions
 */
refreshTokenSchema.statics.getActiveSessions = async function (userId) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  })
    .select("deviceInfo location usedAt lastUsedIp")
    .sort({ usedAt: -1 });
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);

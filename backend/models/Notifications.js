const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userType: {
      type: String,
      enum: ["customer", "vendor", "rider"],
      default: "customer",
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedModel",
    },
    relatedModel: {
      type: String,
      enum: [
        "Order",
        "Delivery",
        "Payment",
        "Wallet",
        "Transaction",
        "Vendor",
        "Rider",
      ],
    },

    type: {
      type: String,
      enum: [
        // 🛒 Order-related notifications
        "order_created",
        "order_confirmed",
        "order_confirmation",
        "order_assigned",
        "order_picked_up",
        "order_delivered",
        "order_cancelled",
        "order_update",

        // � Delivery and wallet
        "delivery_update",
        "delivery_available",
        "wallet_update",

        // 💸 Payment-related notifications
        "payment_received",
        "refund_processed",

        // 📢 System and custom
        "promotion",
        "system_alert",
        "custom",
        "profile_update",
      ],
      default: "custom",
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    channels: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    sentAt: { type: Date },
    expiresAt: { type: Date },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    delivery: {
      inApp: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
      push: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
      email: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
      sms: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
    },
    errorMessage: { type: String },
    metadata: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);

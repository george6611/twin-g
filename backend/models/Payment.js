const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // 🔗 Relationships
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // 💳 Transaction Info
    method: {
      type: String,
      enum: ["mpesa", "card", "wallet", "cash"],
      default: "mpesa",
    },
    transactionId: { type: String },
    referenceCode: { type: String }, // e.g. M-Pesa ref
    amount: { type: Number, required: true },
    currency: { type: String, default: "KES" },

    // 🏦 Status
    status: {
      type: String,
      enum: ["pending", "processing", "successful", "failed", "refunded"],
      default: "pending",
    },
    description: { type: String }, // short note (e.g. “Order Payment”, “Wallet Top-up”)

    // 📅 Tracking
    paidAt: { type: Date },
    refundedAt: { type: Date },

    // 🔐 Audit
    metadata: { type: Object }, // M-Pesa API response, card payload, etc.
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // 🔗 Relationships
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor", // track which vendor got paid (if applicable)
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    // 💵 Core Transaction Details
    type: {
      type: String,
      enum: [
        "wallet_topup",
        "wallet_withdrawal",
        "order_payment",
        "order_refund",
        "vendor_payout",
        "rider_payout",
        "bonus_credit",
        "adjustment",
      ],
      required: true,
    },

    direction: {
      type: String,
      enum: ["credit", "debit"], // money in or money out
      required: true,
    },

    amount: { type: Number, required: true },
    currency: { type: String, default: "KES" },

    // 📋 Status
    status: {
      type: String,
      enum: ["pending", "processing", "successful", "failed", "cancelled", "reversed"],
      default: "pending",
    },

    // 🔍 References and Metadata
    referenceCode: { type: String }, // e.g., M-Pesa ref or internal code
    description: { type: String },
    metadata: { type: Object },

    // 📱 M-Pesa / STK Fields
    mpesaReceiptNumber: { type: String },
    checkoutRequestId: { type: String },
    phoneNumber: { type: String },
    resultCode: { type: Number },
    resultDesc: { type: String },

    // 🧾 Balance Snapshots (for audit)
    openingBalance: { type: Number },
    closingBalance: { type: Number },

    // 👮 Audit Info
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);

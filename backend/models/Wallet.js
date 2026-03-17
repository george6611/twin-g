const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    // 🔗 Relationship
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "ownerModel", // dynamic reference
      required: true,
    },
    ownerModel: {
      type: String,
      enum: ["Customer", "Vendor", "Rider"],
      required: true,
    },

    // 💵 Balance
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "KES" },

    // 💸 Transaction Log
    transactions: [
      {
        type: {
          type: String,
          enum: [
            "credit",         // add funds
            "debit",          // spend funds
            "refund",         // refund from order
            "payout",         // vendor/rider withdrawal
            "bonus",          // cashback or reward
          ],
        },
        amount: { type: Number, required: true },
        reference: { type: String }, // link to Payment or Order
        description: { type: String },
        relatedOrderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);

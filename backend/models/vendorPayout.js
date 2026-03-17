const mongoose = require("mongoose");

const vendorPayoutSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    amount: { type: Number, required: true },
    commission: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "Mpesa" },
    reference: { type: String }, // transaction ref or receipt
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VendorPayout", vendorPayoutSchema);

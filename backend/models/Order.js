const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // 🔗 Relationships
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null, // assigned later
    },

    // 🧺 Order Items
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }, // price per unit at time of order
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true }, // (price - discount) * quantity
        variant: { type: String }, // e.g. "Large", "Red"
      },
    ],

    // 💵 Payment Info
    payment: {
      method: {
        type: String,
        enum: ["mpesa", "card", "cash_on_delivery", "wallet"],
        default: "mpesa",
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      transactionId: { type: String },
      amountPaid: { type: Number, default: 0 },
    },

    // 🚚 Delivery Info
    delivery: {
      address: {
        label: { type: String },
        street: { type: String },
        city: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
      },
      instructions: { type: String },
      deliveryFee: { type: Number, default: 0 },
      estimatedTime: { type: Date },
      deliveredAt: { type: Date },
    },

    // 🧾 Order Summary
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }, // subtotal + deliveryFee - discounts
    currency: { type: String, default: "KES" },

    // 📦 Order Status Tracking
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_payment",        // just placed
        "confirmed",      // accepted by vendor
        "preparing",      // being prepared
        "ready",          // ready for pickup
        "picked",         // rider picked up
        "in_transit",     // rider en route
        "delivered",      // completed
        "cancelled",      // cancelled by user/vendor/admin
        "refunded",       // refund processed
      ],
      default: "pending",
    },

    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String }, // could be 'system', 'vendor', 'rider', 'admin'
      },
    ],

    // 🌍 Tracking & Location Updates (for live delivery)
    tracking: [
      {
        timestamp: { type: Date, default: Date.now },
        location: {
          latitude: { type: Number },
          longitude: { type: Number },
        },
        statusNote: { type: String },
      },
    ],

    // 🎯 Extra Info
    specialInstructions: { type: String },
    promoCode: { type: String },
    discountCode: { type: String },
    platformFee: { type: Number, default: 0 },

    // 🧠 Flags
    isPaid: { type: Boolean, default: false },
    isReviewed: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

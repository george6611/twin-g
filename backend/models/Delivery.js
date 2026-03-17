// models/Delivery.js
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    // 🔗 Relationships
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    // 🚦 Delivery Progress
    status: {
      type: String,
      enum: [
        "pending",      // waiting for assignment
        "assigned",     // rider assigned
        "picked_up",    // picked from vendor
        "in_transit",   // en route to customer
        "delivered",    // successful
        "failed",       // could not deliver
        "cancelled",    // cancelled
      ],
      default: "pending",
    },

    // 🗺️ Route Info
    pickupLocation: {
      address: String,
      latitude: Number,
      longitude: Number,
    },
    dropoffLocation: {
      address: String,
      latitude: Number,
      longitude: Number,
    },

    estimatedDistanceKm: { type: Number },
    estimatedTime: { type: Number }, // in minutes
    deliveryFee: { type: Number, default: 0 },

    // 📍 Live Tracking
    currentLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: { type: Date },
    },
    routeHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        latitude: Number,
        longitude: Number,
        note: String,
      },
    ],

    // 🧾 Completion Data
    deliveredAt: { type: Date },
    remarks: { type: String },
    proofOfDelivery: { type: String }, // photo or signature URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);

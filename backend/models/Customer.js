const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phone: { type: String, required: true },
    email: { type: String },
    name:  { type: String},

    addresses: [
  {
    label: String,
    street: String,
    city: String,
    region: String,
    country: String,
    postalCode: String,
    latitude: Number,
    longitude: Number,
    isPrimary: { type: Boolean, default: false },
  },
],


    preferences: {
      language: { type: String, default: "en" },
      notificationsEnabled: { type: Boolean, default: true },
    },

    defaultPaymentMethod: { type: String, enum: ["cash", "card", "wallet"], default: "wallet" },
    dateOfBirth: { type: Date },

    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    walletBalance: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderDate: { type: Date },

    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    verified: { type: Boolean, default: false },
    profileImage: { type: String },

    notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);

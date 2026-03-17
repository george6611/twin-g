const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },

    // Address
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: String,
      description: String,
    },

    // Location
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" }, // [longitude, latitude]
    },

    // Contact
    phone: String,
    email: String,
    manager: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "active", "inactive"],
      default: "pending",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isPrimary: { type: Boolean, default: false }, // Main branch
    
    // Completeness flag
    isComplete: { type: Boolean, default: false },
    missingFields: [String],

    // Operations
    operatingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },

    // Metadata
    staffCount: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Branch", BranchSchema);

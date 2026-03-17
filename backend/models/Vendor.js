const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    shopName: { type: String, required: true },
    shopDescription: { type: String },

    address: {
      label: { type: String, default: "Main Shop" },
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      region: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "Kenya" },
      description: { type: String, default: "" },

      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    /**
     * ✅ GeoJSON location (used for distance queries)
     * coordinates = [longitude, latitude]
     */
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], index: "2dsphere" },
    },

    contact: { type: String },
    shopLogo: { type: String },

    // 🔹 Track main categories & subcategories separately
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],      // main categories
    subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],   // subcategories

    openingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },

    deliveryAvailable: { type: Boolean, default: true },
    isOpen: { type: Boolean, default: true },

    rating: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 10 },
    walletBalance: { type: Number, default: 0 },

    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
    },

    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    activeOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    recentTransactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],

    documents: [
      {
        type: { type: String },
        url: String,
        verified: { type: Boolean, default: false },
      },
    ],

    status: { type: String, enum: ["active", "suspended", "pending"], default: "active" },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 🔁 Sync GeoJSON location from address lat/lng
VendorSchema.pre("save", function (next) {
  if (this.address?.latitude !== undefined && this.address?.longitude !== undefined) {
    this.location = {
      type: "Point",
      coordinates: [this.address.longitude, this.address.latitude],
    };
  }
  next();
});

// 🔹 Indexes for fast querying
VendorSchema.index({ categories: 1 });
VendorSchema.index({ subCategories: 1 });
VendorSchema.index({ rating: -1 });
VendorSchema.index({ status: 1, isVerified: 1 });
VendorSchema.index({ shopName: "text" });

module.exports = mongoose.model("Vendor", VendorSchema);

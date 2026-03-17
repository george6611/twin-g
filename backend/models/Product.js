const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    category: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },

    description: { type: String, trim: true },
    brand: { type: String, trim: true },

    images: [{ type: String }], // URLs to product images
    thumbnail: { type: String }, // Main image for display

    price: { type: Number, required: true },
    discountPrice: { type: Number }, // optional discounted price
    discountPercentage: { type: Number, default: 0 },

    currency: { type: String, default: "KES" }, // Kenya currency default

    inStock: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0 },

    // for food or services, availability schedule or timing
    availableFrom: { type: Date },
    availableUntil: { type: Date },

    // variations (e.g., size, color, weight)
    variants: [
      {
        name: { type: String }, // e.g. "Size", "Color"
        value: { type: String }, // e.g. "Large", "Red"
        additionalPrice: { type: Number, default: 0 },
        stockQuantity: { type: Number, default: 0 },
      },
    ],

    // relationships for other modules
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],

    // helpful metadata
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },

    tags: [{ type: String }], // e.g. "organic", "fast food", "smartphone"
    sku: { type: String, unique: true, sparse: true }, // Stock Keeping Unit
    barcode: { type: String, sparse: true },

    // logistics info
    weight: { type: Number }, // kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },

    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ✅ Text search for faster queries on product names, descriptions, tags
productSchema.index({ name: "text", description: "text", tags: "text" });

// ✅ Auto-update discount percentage if discountPrice is set
productSchema.pre("save", function (next) {
  if (this.discountPrice && this.price) {
    this.discountPercentage = Math.round(
      ((this.price - this.discountPrice) / this.price) * 100
    );
  } else {
    this.discountPercentage = 0;
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);

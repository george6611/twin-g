const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    slug: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    description: { type: String, trim: true },

    // Self reference for subcategories
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    image: { type: String },
    icon: { type: String },

    // SEO
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: { type: String, default: "" },

    // Display & hierarchy
    order: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    // Optional analytics (do NOT rely on these for logic)
    totalProducts: { type: Number, default: 0 },
    totalVendors: { type: Number, default: 0 },

    tags: [{ type: String }],
  },
  { timestamps: true }
);

// 🔎 Text search index
categorySchema.index({
  name: "text",
  slug: "text",
  keywords: "text",
});

// 🔁 Auto-generate slug on name change
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
  next();
});

/**
 * ✅ Safe helper: find or create category by name
 * NO vendor coupling
 */
categorySchema.statics.findOrCreate = async function (name) {
  if (!name) throw new Error("Category name is required");

  const slug = slugify(name, { lower: true, strict: true });

  let category = await this.findOne({ slug });

  if (!category) {
    category = await this.create({ name, slug });
  }

  return category;
};

categorySchema.index({ parentCategory: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ order: 1 });

module.exports = mongoose.model("Category", categorySchema);

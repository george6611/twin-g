const Category = require("../../models/Category");

// 🟢 Get all main categories (no parent)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ parentCategory: null, status: "active" })
      .select("_id name image icon description")
      .sort({ order: 1 });
    res.status(200).json(categories);
  } catch (err) {
    console.error("❌ Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories", details: err.message });
  }
};

// 🟣 Get subcategories of a given category
exports.getSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subCategories = await Category.find({
      parentCategory: categoryId,
      $or: [{ status: "active" }, { status: { $exists: false } }],
    })
      .select("_id name image icon description parentCategory slug")
      .sort({ order: 1 });

    if (!subCategories.length) {
      console.log(`⚠️ No subcategories found for parent ${categoryId}`);
    }

    res.status(200).json(subCategories);
  } catch (err) {
    console.error("❌ Error fetching subcategories:", err);
    res.status(500).json({
      error: "Failed to fetch subcategories",
      details: err.message,
    });
  }
};


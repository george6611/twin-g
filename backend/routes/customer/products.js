const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const {
  getAllProducts,
  getProductById,
  getCategories,
  getSubCategoriesByCategory,
  search,
} = require("../../controllers/customer/product");

// 🛍️ Public route — anyone can browse products
router.get("/", getAllProducts);

// 🏷️ Public route — list of product categories
router.get("/categories", getCategories);
// ✅ Add a dedicated search route — must come **before** `/:id` to avoid conflicts
router.get("/search", search);

// 📦 Protected route — view product details
router.get("/:id", getProductById);

// Subcategories of a category
router.get("/categories/:categoryId/subcategories", getSubCategoriesByCategory);



module.exports = router;

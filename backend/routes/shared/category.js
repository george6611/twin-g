const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/shared/category");

// Get all categories
router.get("/", categoryController.getAllCategories);

// ✅ Get subcategories of a category
router.get("/:categoryId/subcategories", categoryController.getSubcategories);

module.exports = router;

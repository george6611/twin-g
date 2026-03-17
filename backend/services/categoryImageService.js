// services/categoryImageService.js
const fs = require("fs");
const path = require("path");
const Category = require("../models/Category");

const DEFAULT_IMAGE = "/uploads/categories/default.jpg"; // fallback local image
const CATEGORY_IMAGES_FOLDER = path.join(__dirname, "../uploads/categories");

/**
 * Normalize category name:
 * - lowercase
 * - replace spaces, hyphens, underscores with nothing
 * - e.g., "Fast-Food" → "fastfood"
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[\s-_]/g, "") // remove spaces, hyphens, underscores
    .replace(/([a-z])([A-Z])/g, "$1$2"); // handle camelCase if needed
}

/**
 * Find matching image in uploads/categories folder
 */
function findLocalCategoryImage(categoryName) {
  const normalizedCategory = normalizeName(categoryName);

  const files = fs.readdirSync(CATEGORY_IMAGES_FOLDER);
  for (const file of files) {
    const fileName = path.parse(file).name; // remove extension
    if (normalizeName(fileName) === normalizedCategory) {
      return `/uploads/categories/${file}`; // relative URL
    }
  }

  return DEFAULT_IMAGE;
}

/**
 * Update image for a single category
 */
async function updateCategoryImage(category) {
  try {
    const imageUrl = findLocalCategoryImage(category.name);
    category.image = imageUrl;
    await category.save();
    console.log(`✅ Updated image for category "${category.name}" → ${imageUrl}`);
  } catch (err) {
    console.error(`❌ Failed to update image for "${category.name}":`, err.message);
    category.image = DEFAULT_IMAGE;
    await category.save();
  }
}

/**
 * Update all categories and optionally subcategories
 * @param {boolean} includeSubcategories
 */
async function updateAllCategoriesImages(includeSubcategories = true) {
  const categories = await Category.find({ parentCategory: null });
  console.log(`Found ${categories.length} main categories`);

  for (const cat of categories) {
    await updateCategoryImage(cat);

    if (includeSubcategories) {
      const subcategories = await Category.find({ parentCategory: cat._id });
      for (const sub of subcategories) {
        await updateCategoryImage(sub);
      }
    }
  }

  console.log("✅ All categories updated");
}

module.exports = { updateCategoryImage, updateAllCategoriesImages };

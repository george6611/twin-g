const express = require("express");
const router = express.Router();

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  bulkImportProducts,
} = require("../../controllers/vendor/products");

const { protect, authorizeRoles } = require("../../middleware/auth");
const productUpload = require("../../middleware/productUpload");

// ---------------------------------------------------
// VENDOR PRODUCT ROUTES
// Base path: /api/vendor/products
// ---------------------------------------------------

// 🟢 Create a new product
router.post("/", protect, authorizeRoles("vendor"), productUpload.array("images", 5), createProduct);

// 🟣 Get all products for logged-in vendor
router.get("/", protect, authorizeRoles("vendor"), getAllProducts);

// 🔵 Get single product details
router.get("/:id", protect, authorizeRoles("vendor"), getProductById);

// 🟡 Update product details
router.put("/:id", protect, authorizeRoles("vendor"), updateProduct);

// 🔴 Delete product
router.delete("/:id", protect, authorizeRoles("vendor"), deleteProduct);

// 🖼️ Upload product image (single or multiple)
router.post(
  "/:id/upload",
  protect,
  authorizeRoles("vendor"),
  productUpload.array("images", 5), // up to 5 images
  uploadProductImage
);

// 📊 Bulk import products from CSV/XLSX
router.post(
  "/bulk/import",
  protect,
  authorizeRoles("vendor"),
  productUpload.single("file"), // single CSV or XLSX file
  bulkImportProducts
);

module.exports = router;

const express = require("express");
const router = express.Router();

const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} = require("../../controllers/vendor/products");

const { protect, authorizeRoles } = require("../../middleware/auth");
const fileUpload = require("../../middleware/fileUpload"); // ✅ your upload middleware

// ---------------------------------------------------
// VENDOR PRODUCT ROUTES
// Base path: /api/vendor/products
// ---------------------------------------------------

// 🟢 Create a new product
router.post("/", protect, authorizeRoles("vendor"), createProduct);

// 🟣 Get all products for the logged-in vendor
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
  fileUpload.array("images", 5), // upload up to 5 images
  uploadProductImage
);

module.exports = router;

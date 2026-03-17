const express = require("express");
const router = express.Router();
const {
  getVendors,
  filterVendors,
  getVendorById,
  getVendorItems, // ✅ import this
} = require("../../controllers/customer/vendor");

// 🟢 Get ALL vendors (no filters)
router.get("/", getVendors);

// 🟣 Get FILTERED vendors (search, category, sort, rating)
router.get("/filter", filterVendors);

// 🔵 Get SINGLE vendor by ID
router.get("/:id", getVendorById);

// 🟠 Get VENDOR items (by vendorId, with optional subCategory/category filters)
router.get("/:vendorId/items", getVendorItems); // ✅ add this

module.exports = router;

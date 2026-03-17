const express = require("express");
const router = express.Router();

const {
  getVendorOrders,
  getOrderById,
  updateOrderStatus,
  getOrderSummary,
} = require("../../controllers/vendor/orders");

const { protect, authorizeRoles } = require("../../middleware/auth");

// 🧾 Vendor Order Management Routes

// ✅ Get vendor order summary
router.get("/summary", protect, authorizeRoles("vendor"), getOrderSummary);

// ✅ Get all vendor orders
router.get("/", protect, authorizeRoles("vendor"), getVendorOrders);

// ✅ Get single order by ID (includes status + history)
router.get("/:id", protect, authorizeRoles("vendor"), getOrderById);

// ✅ Existing correct route
router.put("/:id/status", protect, authorizeRoles("vendor"), updateOrderStatus);

// 🧩 Optional alias (so both work)
router.put("/:id", protect, authorizeRoles("vendor"), updateOrderStatus);


module.exports = router;

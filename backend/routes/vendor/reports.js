const express = require("express");
const {
  getAllOrders,
  getStockAnalytics,
  getCustomerAnalytics,
  getRevenueAnalytics,
  getCustomerReviews,
} = require("../../controllers/vendor/reports");

const { protect, authorizeRoles } = require("../../middleware/auth");

const router = express.Router();

/**
 * 📄 Vendor Reports Routes
 * Base: /api/vendor/reports
 * Protected: Yes (Vendor only)
 */

// 🧾 Get all orders for the vendor
router.get("/orders", protect, authorizeRoles("vendor"), getAllOrders);

// 📦 Stock analytics (in-stock, out-of-stock, sold, returned)
router.get("/analytics/stock", protect, authorizeRoles("vendor"), getStockAnalytics);

// 👥 Customer analytics (active customers, visits)
router.get("/analytics/customers", protect, authorizeRoles("vendor"), getCustomerAnalytics);

// 💰 Revenue analytics (daily, weekly, monthly)
router.get("/analytics/revenue", protect, authorizeRoles("vendor"), getRevenueAnalytics);

// ⭐ Customer reviews / feedback
router.get("/analytics/reviews", protect, authorizeRoles("vendor"), getCustomerReviews);

module.exports = router;

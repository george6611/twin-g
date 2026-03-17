const express = require("express");
const {
  getSalesAnalytics,
  getProductAnalytics,
  getPerformanceOverview,
  getEarningsAnalytics,
} = require("../../controllers/vendor/analytics");

const { protect, authorizeRoles } = require("../../middleware/auth");

const router = express.Router();

/**
 * 📊 Vendor Analytics Routes
 * Base: /api/vendor/analytics
 * Protected: Vendor only
 */

// Total revenue and sales trend (30 days)
router.get("/sales", protect, authorizeRoles("vendor"), getSalesAnalytics);

// Product stats (low stock, top sellers, total count)
router.get("/products", protect, authorizeRoles("vendor"), getProductAnalytics);

// Dashboard summary (orders, revenue, recent activity)
router.get("/overview", protect, authorizeRoles("vendor"), getPerformanceOverview);

// Earnings insights (total + last 7 days)
router.get("/earnings", protect, authorizeRoles("vendor"), getEarningsAnalytics);

module.exports = router;

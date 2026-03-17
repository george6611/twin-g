const express = require("express");
const router = express.Router();

const staffRoutes = require("./vendor/staff");
const branchRoutes = require("./vendor/branches_new");
const ordersController = require("../controllers/vendor/orders");
const vendorController = require("../controllers/vendor/vendor");
const { protect, authorizeRoles } = require("../middleware/auth");

console.log("📦 [VENDORS ROUTER] Loading...");

// ==================== VENDORS ROUTES ====================
// Base path: /api/vendors

// Log all requests to this router
router.use((req, res, next) => {
  console.log(`📦 [VENDORS] ${req.method} ${req.path} (vendorId: ${req.params.vendorId})`);
  next();
});

// Mount nested resource routes
console.log("📦 [VENDORS ROUTER] Mounting /:vendorId/branches");
router.use("/:vendorId/branches", branchRoutes);

console.log("📦 [VENDORS ROUTER] Mounting /:vendorId/staff");
router.use("/:vendorId/staff", staffRoutes);

// Dashboard route
router.get(
  "/:vendorId/dashboard",
  protect,
  authorizeRoles("vendor", "vendor_staff", "admin"),
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      
      const Branch = require("../models/Branch");
      const User = require("../models/User");
      const Order = require("../models/Order");
      const mongoose = require("mongoose");
      
      // Convert vendorId string to ObjectId for aggregation
      const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
      
      console.log("📊 [DASHBOARD] Fetching stats for vendorId:", vendorId);
      
      // Count branches
      const branchCount = await Branch.countDocuments({ vendorId });
      const activeBranchCount = await Branch.countDocuments({ vendorId, status: 'active' });
      const pendingBranchCount = await Branch.countDocuments({ vendorId, status: 'pending' });
      console.log("📊 [DASHBOARD] Branches:", { total: branchCount, active: activeBranchCount, pending: pendingBranchCount });
      
      // Count staff (vendor_staff role with this vendorId)
      const staffCount = await User.countDocuments({ 
        role: "vendor_staff", 
        vendorId 
      });
      console.log("📊 [DASHBOARD] Staff count:", staffCount);
      
      // Count total orders
      const totalOrders = await Order.countDocuments({ vendorId });
      console.log("📊 [DASHBOARD] Total orders:", totalOrders);
      
      // Count active orders (pending, confirmed, preparing, ready, picked_up)
      const activeOrders = await Order.countDocuments({
        vendorId,
        status: { $in: ["pending", "confirmed", "preparing", "ready", "picked_up"] }
      });
      console.log("📊 [DASHBOARD] Active orders:", activeOrders);
      
      // Calculate total revenue from completed orders
      const revenueResult = await Order.aggregate([
        { 
          $match: { 
            vendorId: vendorObjectId,
            status: "delivered" 
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]);
      const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
      console.log("📊 [DASHBOARD] Revenue:", revenue);
      
      // Count unique customers who ordered from this vendor
      const customerCount = await Order.distinct("customerId", { vendorId });
      console.log("📊 [DASHBOARD] Customer count:", customerCount.length);
      
      res.json({
        success: true,
        data: {
          total: totalOrders,
          revenue: revenue,
          active: activeOrders,
          branches: branchCount,
          activeBranches: activeBranchCount,
          pendingBranches: pendingBranchCount,
          staff: staffCount,
          customers: customerCount.length,
        },
      });
    } catch (err) {
      console.error("❌ [DASHBOARD] Error:", err);
      res.status(500).json({ message: "Server error: " + err.message });
    }
  }
);

// Orders routes
router.get(
  "/:vendorId/orders",
  protect,
  authorizeRoles("vendor", "vendor_staff", "admin"),
  ordersController.getVendorOrders
);

router.get(
  "/:vendorId/orders/:orderId",
  protect,
  authorizeRoles("vendor", "vendor_staff", "admin"),
  ordersController.getOrderById
);

// Delete vendor (admin only) - DELETE /api/vendors/:vendorId
router.delete(
  "/:vendorId",
  protect,
  authorizeRoles("admin"),
  vendorController.deleteVendor
);

console.log("📦 [VENDORS ROUTER] Loaded successfully");

module.exports = router;

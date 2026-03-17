const express = require("express");
const router = express.Router({ mergeParams: true });
const branchController = require("../../controllers/vendor/branches_new");
const { protect, authorizeRoles } = require("../../middleware/auth");

console.log("📦 [BRANCHES ROUTES] Loading fresh routes...");

// All routes require authentication
router.use(protect);

// POST /api/vendors/:vendorId/branches - Create branch
router.post(
  "/",
  authorizeRoles("vendor", "admin"),
  branchController.createBranch
);

// GET /api/vendors/:vendorId/branches - List branches
router.get(
  "/", 
  branchController.getVendorBranches
);

// GET /api/vendors/:vendorId/branches/:branchId/stats
router.get(
  "/:branchId/stats",
  branchController.getBranchStats
);

// GET /api/vendors/:vendorId/branches/:branchId/staff
router.get(
  "/:branchId/staff",
  branchController.getBranchStaff
);

// GET /api/vendors/:vendorId/branches/:branchId/orders
router.get(
  "/:branchId/orders",
  branchController.getBranchOrders
);

// GET /api/vendors/:vendorId/branches/:branchId/activity
router.get(
  "/:branchId/activity",
  branchController.getBranchActivity
);

// GET /api/vendors/:vendorId/branches/:branchId - Get single branch
router.get(
  "/:branchId",
  branchController.getBranch
);

// PATCH /api/vendors/:vendorId/branches/:branchId - Update branch
router.patch(
  "/:branchId",
  authorizeRoles("vendor", "admin"),
  branchController.updateBranch
);

// DELETE /api/vendors/:vendorId/branches/:branchId - Delete branch
router.delete(
  "/:branchId",
  authorizeRoles("vendor", "admin"),
  branchController.deleteBranch
);

console.log("✅ [BRANCHES ROUTES] Fresh routes loaded");

module.exports = router;

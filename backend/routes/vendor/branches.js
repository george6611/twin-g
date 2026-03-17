const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  createBranch,
  getVendorBranches,
  getBranch,
  updateBranch,
  deleteBranch,
} = require("../../controllers/vendor/branches");

const { protect, authorizeRoles } = require("../../middleware/auth");

// ==================== BRANCHES ROUTES ====================
// Base path: /api/vendors/:vendorId/branches

// Log all requests
router.use((req, res, next) => {
  console.log(`📦 [BRANCHES] ${req.method} ${req.originalUrl}`);
  next();
});

// Apply protect middleware to all routes
router.use(protect);

// 🟢 Create branch - POST /api/vendors/:vendorId/branches
router.post("/", authorizeRoles("vendor", "admin"), createBranch);

// 🟣 Get all branches - GET /api/vendors/:vendorId/branches
router.get("/", authorizeRoles("vendor", "admin"), getVendorBranches);

// 🔵 Get single branch - GET /api/vendors/:vendorId/branches/:branchId  
router.get("/:branchId", authorizeRoles("vendor", "admin"), getBranch);

// 🟡 Update branch - PATCH /api/vendors/:vendorId/branches/:branchId
router.patch("/:branchId", authorizeRoles("vendor", "admin"), updateBranch);

// 🔴 Delete branch - DELETE /api/vendors/:vendorId/branches/:branchId
router.delete("/:branchId", authorizeRoles("vendor", "admin"), deleteBranch);

module.exports = router;

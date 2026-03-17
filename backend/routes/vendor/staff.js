const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  createStaff,
  getVendorStaff,
  updateStaff,
  deactivateStaff,
} = require("../../controllers/vendor/staff");

const { protect, authorizeRoles } = require("../../middleware/auth");

// ==================== STAFF ROUTES ====================
// Base path: /api/vendors/:vendorId/staff

// Apply protect to all routes
router.use(protect);

// 🟢 Create staff member
router.post(
  "/",
  authorizeRoles("vendor", "admin"),
  createStaff
);

// 🟣 Get all staff for vendor
router.get(
  "/",
  authorizeRoles("vendor", "admin"),
  getVendorStaff
);

// 🟡 Update staff
router.patch(
  "/:staffId",
  authorizeRoles("vendor", "admin"),
  updateStaff
);

// 🔴 Deactivate staff
router.patch(
  "/:staffId/deactivate",
  authorizeRoles("vendor", "admin"),
  deactivateStaff
);

module.exports = router;

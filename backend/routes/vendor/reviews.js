const express = require("express");
const {
  createReview,
  getVendorReviews,
  updateReview,
  deleteReview,
} = require("../../controllers/vendor/reviews");
const {protect, authorizeRoles} = require("../../middleware/auth")
const router = express.Router();

// Vendor Reviews Routes
router.post("/", protect, authorizeRoles("customer"), createReview);
router.get("/", protect, authorizeRoles("vendor"), getVendorReviews);
router.put("/:id", protect, authorizeRoles("customer"), updateReview);
router.delete("/:id", protect, authorizeRoles("customer"), deleteReview);

module.exports = router;

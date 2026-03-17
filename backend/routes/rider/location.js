// backend/routes/rider/location.js
const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const {
  updateRiderLocation,
  getRiderLocation,
  getDeliveryTracking,
} = require("../../controllers/rider/location");

/**
 * @route   POST /api/rider/location
 * @desc    Update rider's current location (real-time tracking)
 * @access  Private (rider)
 * @body    { latitude, longitude, orderId (optional) }
 */
router.post("/", protect, authorizeRoles("rider"), updateRiderLocation);

/**
 * @route   GET /api/rider/location
 * @desc    Get rider's current location
 * @access  Private (rider)
 */
router.get("/", protect, authorizeRoles("rider"), getRiderLocation);

/**
 * @route   GET /api/rider/location/:orderId
 * @desc    Get full tracking history for a delivery
 * @access  Private (rider/customer)
 */
router.get("/:orderId", protect, getDeliveryTracking);

module.exports = router;

const express = require("express");
const {
  getAssignedDeliveries,
  getAvailableDeliveries,
  acceptDelivery,
  getDeliveriesSummary,
  getRecentDeliveries,
  updateDeliveryStatus,
  getRiderDashboard, // 👈 added
} = require("../../controllers/rider/deliveries");
const { protect, authorizeRoles } = require("../../middleware/auth");

const router = express.Router();

// 📦 Assigned deliveries
router.get("/", protect, authorizeRoles("rider"), getAssignedDeliveries);
router.get("/assigned", protect, authorizeRoles("rider"), getAssignedDeliveries);

// 🟢 Available deliveries
router.get("/available", protect, authorizeRoles("rider"), getAvailableDeliveries);

// 🟡 Accept a delivery
router.put("/:orderId/accept", protect, authorizeRoles("rider"), acceptDelivery);

// 🔄 Update delivery status
router.put("/:deliveryId/status", protect, authorizeRoles("rider"), updateDeliveryStatus);

// 📊 Summary and recent
router.get("/summary", protect, authorizeRoles("rider"), getDeliveriesSummary);
router.get("/recent", protect, authorizeRoles("rider"), getRecentDeliveries);

// 🚀 Dashboard (combined data)
router.get("/dashboard", protect, authorizeRoles("rider"), getRiderDashboard);

module.exports = router;

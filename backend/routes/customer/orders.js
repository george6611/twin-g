const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const {
  placeOrder,
  getMyOrders,
  getOrderDetails,
  getActiveOrders,
} = require("../../controllers/customer/order");

// ---------------------------------------------------
// CUSTOMER ORDER ROUTES
// Base path: /api/customer/orders
// ---------------------------------------------------

// 🟢 Place new order
router.post("/", protect, authorizeRoles("customer"), placeOrder);

// 🟣 Get all my orders (with pagination, filters, search)
// Example query params: ?page=1&limit=20&status=delivered,pending&timeRange=last7days&search=ShopName
router.get("/", protect, authorizeRoles("customer"), getMyOrders);

// 🟠 Get all ongoing (active) orders with location tracking
router.get("/active", protect, authorizeRoles("customer"), getActiveOrders);

// 🟡 Get specific order details
router.get("/:id", protect, authorizeRoles("customer"), getOrderDetails);

module.exports = router;

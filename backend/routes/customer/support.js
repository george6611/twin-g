const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const {
  createTicket,
  getMyTickets,
  getTicketDetails,
} = require("../../controllers/customer/support");

// ---------------------------------------------------
// CUSTOMER SUPPORT ROUTES
// Base path: /api/customer/support
// ---------------------------------------------------

// 🆕 Create a support ticket
router.post("/", protect, authorizeRoles("customer"), createTicket);

// 📋 Get all my support tickets
router.get("/", protect, authorizeRoles("customer"), getMyTickets);

// 🔍 Get a specific ticket
router.get("/:id", protect, authorizeRoles("customer"), getTicketDetails);

module.exports = router;

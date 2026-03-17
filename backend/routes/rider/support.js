const express = require("express");
const router = express.Router();
const {protect, authorizeRoles} = require("../../middleware/auth")

const {
  getTickets,
  createTicket,
  updateTicketStatus,
} = require("../../controllers/rider/support");

// Get all rider tickets
router.get("/", protect, authorizeRoles("rider"), getTickets);

// Create a new ticket
router.post("/", protect, authorizeRoles("rider"), createTicket);

// Optional: update ticket status
router.put("/status", protect, authorizeRoles("rider"), updateTicketStatus);

module.exports = router;

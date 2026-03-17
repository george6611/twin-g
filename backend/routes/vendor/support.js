const express = require("express");
const {
  createTicket,
  getAllTickets,
  getTicketById,
  respondToTicket,
  closeTicket,
} = require("../../controllers/vendor/support");
const {protect, authorizeRoles} = require("../../middleware/auth")

const router = express.Router();

// Vendor support ticket routes
router.post("/", protect, authorizeRoles("vendor"), createTicket);
router.get("/", protect, authorizeRoles("vendor"), getAllTickets);
router.get("/:id", protect, authorizeRoles("vendor"), getTicketById);
router.put("/:id/respond", protect, authorizeRoles("vendor"), respondToTicket);
router.put("/:id/close", protect, authorizeRoles("vendor"), closeTicket);

module.exports = router;

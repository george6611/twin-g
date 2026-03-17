const SupportTicket = require("../../models/SupportTicket");

// Get all tickets for this rider
exports.getTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ createdBy: req.rider._id })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new ticket
exports.createTicket = async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message)
    return res.status(400).json({ message: "Subject and message are required" });

  try {
    const ticket = await SupportTicket.create({
      subject,
      message,
      createdBy: req.rider._id,
      role: "rider",
      status: "open",
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Optional: update ticket status (e.g., resolved)
exports.updateTicketStatus = async (req, res) => {
  const { ticketId, status } = req.body;

  if (!ticketId || !status)
    return res.status(400).json({ message: "Ticket ID and status required" });

  try {
    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Ensure only this rider can update their ticket
    if (ticket.createdBy.toString() !== req.rider._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    ticket.status = status;
    await ticket.save();

    res.json({ message: "Ticket updated", ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

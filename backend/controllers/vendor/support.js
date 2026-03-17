const SupportTicket = require("../../models/SupportTicket");
const Notification = require("../../models/Notifications");

// 🎫 Create new support ticket
exports.createTicket = async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    const vendorId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message required" });
    }

    const ticket = await SupportTicket.create({
      vendor: vendorId,
      subject,
      messages: [{ sender: "vendor", message }],
      priority: priority || "medium",
    });

    // Notify admin
    await Notification.create({
      recipientType: "Admin",
      title: "New Vendor Support Ticket",
      message: `Vendor #${vendorId} created a new support ticket: "${subject}"`,
      type: "Support",
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error("Create support ticket error:", err);
    res.status(500).json({ message: "Failed to create support ticket" });
  }
};

// 📋 Get all tickets for a vendor
exports.getAllTickets = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const tickets = await SupportTicket.find({ vendor: vendorId }).sort({
      createdAt: -1,
    });
    res.json(tickets);
  } catch (err) {
    console.error("Get all tickets error:", err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};

// 🔍 Get single ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  } catch (err) {
    console.error("Get ticket error:", err);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
};

// 💬 Vendor responds to a ticket
exports.respondToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    const { id } = req.params;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.messages.push({ sender: "vendor", message });
    ticket.status = "open";
    await ticket.save();

    // Notify admin
    await Notification.create({
      recipientType: "Admin",
      title: "Vendor Responded to Ticket",
      message: `Vendor responded to ticket: "${ticket.subject}"`,
      type: "Support",
    });

    res.json(ticket);
  } catch (err) {
    console.error("Respond to ticket error:", err);
    res.status(500).json({ message: "Failed to respond to ticket" });
  }
};

// ✅ Close ticket
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "closed";
    await ticket.save();

    res.json({ message: "Ticket closed successfully" });
  } catch (err) {
    console.error("Close ticket error:", err);
    res.status(500).json({ message: "Failed to close ticket" });
  }
};

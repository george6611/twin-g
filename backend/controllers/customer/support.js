const SupportTicket = require("../../models/SupportTicket");
const Notification = require("../../models/Notifications");

// ---------------------- CREATE SUPPORT TICKET ----------------------
const createTicket = async (req, res) => {
  try {
    const { subject, message, orderId, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required.",
      });
    }

    // ✅ Create ticket
    const ticket = await SupportTicket.create({
      customer: req.user._id,
      subject,
      message,
      category: category || "general",
      order: orderId || null,
      status: "open",
      messages: [
        {
          senderType: "customer",
          message,
          timestamp: new Date(),
        },
      ],
    });

    // ✅ Notify admin/support team
    await Notification.create({
      userId: null, // null means it's for the admin panel
      relatedId: ticket._id,
      relatedModel: "SupportTicket",
      type: "support_ticket",
      title: "New Support Ticket",
      message: `A customer has created a new ticket: ${subject}`,
    });

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      ticket,
    });
  } catch (err) {
    console.error("❌ Error creating support ticket:", err);
    res.status(500).json({
      success: false,
      message: "Server error while creating support ticket.",
    });
  }
};

// ---------------------- GET MY TICKETS ----------------------
const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ customer: req.user._id })
      .populate("order", "orderNumber totalAmount status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, tickets });
  } catch (err) {
    console.error("❌ Error fetching tickets:", err);
    res.status(500).json({ success: false, message: "Error fetching tickets" });
  }
};

// ---------------------- GET A SINGLE TICKET (optional) ----------------------
const getTicketDetails = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      customer: req.user._id,
    })
      .populate("order", "orderNumber totalAmount status");

    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    console.error("❌ Error fetching ticket details:", err);
    res.status(500).json({ success: false, message: "Error fetching ticket details" });
  }
};

module.exports = { createTicket, getMyTickets, getTicketDetails };

const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }], // optional image/audio/file URLs
    sentAt: { type: Date, default: Date.now },
    internal: { type: Boolean, default: false }, // mark as internal admin note
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    // 🔗 Relationships
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // support staff or admin
    },

    // 🧾 Ticket Details
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "order_issue",
        "payment_issue",
        "delivery_issue",
        "account_issue",
        "technical_issue",
        "feedback",
        "other",
      ],
      default: "other",
    },
    description: { type: String },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    // 💬 Communication Thread
    messages: [supportMessageSchema],

    // 🕓 Timeline
    openedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },

    // 📁 Attachments / Evidence
    attachments: [{ type: String }],

    // 📜 Audit and Notes
    adminNotes: { type: String }, // private notes
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", supportTicketSchema);

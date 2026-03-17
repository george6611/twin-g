const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "senderType",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "receiverType",
    required: true,
  },
  senderType: {
    type: String,
    enum: ["Customer", "Vendor", "Rider"],
    required: true,
  },
  receiverType: {
    type: String,
    enum: ["Customer", "Vendor", "Rider"],
    required: true,
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);

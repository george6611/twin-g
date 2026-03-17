const Message = require("../../models/Message");
const mongoose = require("mongoose");
const User = require("../../models/User");

// Get all conversations for a user (by role)
exports.getConversations = async (req, res) => {
  try {
    console.log('🔍 getConversations called with user:', req.user);
    
    const userId = req.user?.id || req.body.userId;
    const userType = req.user?.role || req.body.userType;

    console.log('📋 userId:', userId, 'userType:', userType);

    if (!userId || !userType) {
      console.warn('❌ Missing userId or userType');
      return res.status(400).json({ message: "Missing userId or userType" });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('❌ Invalid userId format:', userId);
      return res.status(400).json({ message: "Invalid userId format" });
    }

    // Convert userType to match Message model enum (capitalize first letter)
    const modelType = userType.charAt(0).toUpperCase() + userType.slice(1);

    // Find or create support admin user
    let supportUser = await User.findOne({ role: "admin", name: "GN Support" });
    if (!supportUser) {
      // Create a support admin if it doesn't exist
      supportUser = await User.create({
        name: "GN Support",
        phone: "0700000000",
        email: "support@gndelivery.com",
        role: "admin",
        isVerified: true,
        isActive: true,
        password: "support_password_123",
      });
      console.log('✅ Created support user:', supportUser._id);
    }

    // Find unique conversations where user is either sender or receiver
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userObjectId, senderType: modelType },
            { receiverId: userObjectId, receiverType: modelType },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userObjectId] },
              "$receiverId",
              "$senderId",
            ],
          },
          receiverType: {
            $first: {
              $cond: [
                { $eq: ["$senderId", userObjectId] },
                "$receiverType",
                "$senderType",
              ],
            }
          },
          lastMessage: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$senderId", userObjectId] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Check if support conversation exists
    const supportConversationExists = conversations.some(conv => 
      conv._id.toString() === supportUser._id.toString()
    );

    // Populate user names for all conversations
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        if (conv._id && !conv.title) {
          try {
            const otherUser = await User.findById(conv._id).select('name profileImage').lean();
            return {
              ...conv,
              title: otherUser?.name || 'User',
              otherUserName: otherUser?.name,
              profileImage: otherUser?.profileImage,
            };
          } catch (err) {
            console.error('Error populating user:', err);
            return conv;
          }
        }
        return conv;
      })
    );

    // Add support conversation to the top if it doesn't already exist
    if (!supportConversationExists) {
      populatedConversations.unshift({
        _id: supportUser._id,
        title: 'GN Support',
        otherUserName: 'GN Support',
        profileImage: supportUser.profileImage,
        receiverType: "Admin",
        lastMessage: {
          _id: new mongoose.Types.ObjectId(),
          message: "👋 Welcome to Support! How can we help you today?",
          createdAt: new Date(),
          read: true,
          senderId: supportUser._id,
          senderType: "Admin",
        },
        unread: 0,
        isSupport: true,
      });
    } else {
      // Ensure support conversation has isSupport flag
      populatedConversations.forEach((conv) => {
        if (conv._id.toString() === supportUser._id.toString()) {
          conv.isSupport = true;
          if (!conv.title) conv.title = 'GN Support';
        }
      });
    }

    console.log('✅ Found conversations:', populatedConversations.length);
    res.json({ conversations: populatedConversations, success: true });
  } catch (err) {
    console.error("❌ Error fetching conversations:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Get messages in a specific conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id || req.body.userId;

    if (!conversationId || !userId) {
      return res.status(400).json({ message: "Missing conversationId or userId" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);

    const messages = await Message.find({
      $or: [
        { senderId: userObjectId, receiverId: conversationObjectId },
        { senderId: conversationObjectId, receiverId: userObjectId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "name email")
      .populate("receiverId", "name email");

    res.json({ messages });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ message: err.message });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, body, content } = req.body;
    const userId = req.user?.id || req.body.senderId;
    const userRole = req.user?.role || req.body.senderType || 'customer';

    if (!conversationId || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const messageText = text || body || content || "";
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);

    // Capitalize user role for schema enum (Customer, Vendor, Rider)
    const senderType = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    const receiverType = req.body.receiverType || "Customer"; // fallback

    const msg = await Message.create({
      senderId: userObjectId,
      senderType,
      receiverId: conversationObjectId,
      receiverType,
      message: messageText,
      read: false,
    });

    const populated = await msg.populate("senderId", "name email");

    // Emit via socket if available
    const io = req.app?.get?.("io");
    if (io) {
      io.emit("message", {
        ...msg.toObject(),
        conversationId,
        text: messageText,
        createdAt: msg.createdAt,
      });
    }

    res.status(201).json({ message: populated, success: true });
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageObjectId = new mongoose.Types.ObjectId(messageId);
    const msg = await Message.findByIdAndUpdate(messageObjectId, { read: true }, { new: true });
    res.json({ message: msg, success: true });
  } catch (err) {
    console.error("❌ Error marking message as read:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

// Start/create a conversation
exports.startConversation = async (req, res) => {
  try {
    const { participants, title } = req.body;
    const userId = req.user?.id || req.body.userId;
    const userType = req.user?.role || req.body.userType;

    if (!participants || !userId) {
      return res.status(400).json({ message: "Missing participants or userId" });
    }

    // Placeholder conversation creation - modify as needed
    res.status(201).json({ 
      _id: participants,
      title: title || `Conversation with ${participants}`,
      participants: [userId, participants],
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Error starting conversation:", err);
    res.status(500).json({ message: err.message });
  }
};

// Legacy endpoint - get conversation with query params
exports.getConversation = async (req, res) => {
  try {
    const { user1, user2 } = req.query;

    const user1ObjectId = new mongoose.Types.ObjectId(user1);
    const user2ObjectId = new mongoose.Types.ObjectId(user2);

    const messages = await Message.find({
      $or: [
        { senderId: user1ObjectId, receiverId: user2ObjectId },
        { senderId: user2ObjectId, receiverId: user1ObjectId },
      ],
    }).sort({ createdAt: 1 });

    res.json({ messages, success: true });
  } catch (err) {
    console.error("❌ Error fetching conversation:", err);
    res.status(500).json({ message: err.message, success: false });
  }
};

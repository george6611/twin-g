const express = require('express');
const router = express.Router();
const messageController = require('../../controllers/shared/message');
const { protectRider } = require('../../middleware/riderAuth');

// Wrapper to add user data to req
const withUserData = (role) => (req, res, next) => {
  if (req.customer || req.vendor || req.rider) {
    const user = req.customer || req.vendor || req.rider;
    req.user = { id: user._id, role: role || 'rider' };
  }
  next();
};

// All rider message routes require rider auth
router.use(protectRider);
router.use(withUserData('rider'));

// Get all conversations (must come before /:conversationId)
router.get('/conversations', messageController.getConversations);

// Start a new conversation
router.post('/conversations', messageController.startConversation);

// Mark message as read (must come before /:conversationId pattern)
router.put('/:conversationId/messages/:messageId/read', messageController.markAsRead);

// Get messages from a specific conversation
router.get('/:conversationId', messageController.getMessages);

// Send a message
router.post('/:conversationId', messageController.sendMessage);

module.exports = router;

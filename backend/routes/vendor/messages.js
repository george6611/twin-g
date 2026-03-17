const express = require('express');
const router = express.Router();
const messageController = require('../../controllers/shared/message');
const { protectVendor } = require('../../middleware/vendorAuth');

// Wrapper to add user data to req
const withUserData = (role) => (req, res, next) => {
  if (req.customer || req.vendor || req.rider) {
    const user = req.customer || req.vendor || req.rider;
    req.user = { id: user._id, role: role || 'vendor' };
  }
  next();
};

// All vendor message routes require vendor auth
router.use(protectVendor);
router.use(withUserData('vendor'));

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

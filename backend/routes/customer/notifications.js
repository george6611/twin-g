const express = require("express");
const router = express.Router();
const { getNotifications, markAsRead, deleteNotification } = require("../../controllers/customer/notification");
const {protect, authorizeRoles} = require("../../middleware/auth")

// Get all notifications
router.get("/", protect, authorizeRoles("customer"), getNotifications);

// Mark a notification as read
router.patch("/:id/read", protect, authorizeRoles("customer"), markAsRead);

// Delete a notification
router.delete("/:id", protect, authorizeRoles("customer"), deleteNotification);

module.exports = router;

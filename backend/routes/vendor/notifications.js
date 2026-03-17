const express = require("express");
const {
  createNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
} = require("../../controllers/vendor/notifications");

const { protect, authorizeRoles } = require("../../middleware/auth");

const router = express.Router();

// ===============================
// 📬 Vendor Notifications Routes
// ===============================

// 📨 Create a notification (mostly for internal/testing use)
router.post("/", protect, authorizeRoles("vendor"), createNotification);

// 🔔 Get all notifications for the vendor
router.get("/", protect, authorizeRoles("vendor"), getNotifications);

// 👀 Mark a notification as read
router.put("/:id/read", protect, authorizeRoles("vendor"), markAsRead);

// ❌ Delete a notification
router.delete("/:id", protect, authorizeRoles("vendor"), deleteNotification);

module.exports = router;

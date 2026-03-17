// utils/notifyUtils.js
const Notification = require("../models/Notifications");

/**
 * Send a notification to a user.
 * Supports multiple channels: inApp, push, email, sms
 *
 * @param {Object} options
 * @param {String} options.recipientId - User ID to notify
 * @param {String} options.userType - 'customer' | 'vendor' | 'rider' (default: 'vendor')
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.type - Notification type (order_update, delivery_available, etc.)
 * @param {String} options.relatedId - Related model ID (Order, Delivery, etc.)
 * @param {String} options.relatedModel - Model name related to notification
 */
const sendNotification = async ({
  recipientId,
  userType = "vendor",
  title,
  message,
  type,
  relatedId,
  relatedModel,
}) => {
  try {
    if (!recipientId) {
      console.warn("Notification skipped: recipientId not provided.");
      return;
    }

    const notification = await Notification.create({
      userId: recipientId,
      userType,
      title,
      message,
      type,
      relatedId,
      relatedModel,
      isRead: false,
      status: "pending",
      delivery: {
        inApp: "pending",
        push: "pending",
        email: "pending",
        sms: "pending",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Optionally: trigger push/email/sms here if you have integration
    // e.g., sendPushNotification(userId, title, message)
    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
};

module.exports = sendNotification;

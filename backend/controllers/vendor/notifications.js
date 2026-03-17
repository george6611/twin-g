const Notification = require("../../models/Notifications");
const Product = require("../../models/Product");
const Order = require("../../models/Order");

/**
 * ✅ Helper — create notification easily from any module
 * Call: createVendorNotification(vendorId, title, message, type)
 */
exports.createVendorNotification = async (
  vendorId,
  title,
  message,
  type = "info"
) => {
  try {
    await Notification.create({
      recipient: vendorId,
      recipientType: "Vendor",
      title,
      message,
      type,
    });
  } catch (err) {
    console.error("Vendor Notification Helper Error:", err);
  }
};

// 📨 Create notification manually (for testing / internal use)
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const vendorId = req.vendor._id;

    if (!title || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Title and message are required" });
    }

    const notification = await Notification.create({
      recipient: vendorId,
      recipientType: "Vendor",
      title,
      message,
      type: type || "info",
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (err) {
    console.error("Create Notification Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
      error: err.message,
    });
  }
};

// 🔔 Get all notifications for a vendor
exports.getNotifications = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const notifications = await Notification.find({
      recipient: vendorId,
      recipientType: "Vendor",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Vendor notifications fetched successfully",
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: err.message,
    });
  }
};

// 👀 Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: vendorId, recipientType: "Vendor" },
      { isRead: true },
      { new: true }
    );

    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    console.error("Mark Notification Read Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark as read",
      error: err.message,
    });
  }
};

// ❌ Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor._id;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      recipient: vendorId,
      recipientType: "Vendor",
    });

    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (err) {
    console.error("Delete Notification Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: err.message,
    });
  }
};

/**
 * ⚙️ Auto-trigger notifications (system events)
 * Can be imported and called when events happen — e.g., order created, stock low, etc.
 */
exports.autoTriggerVendorNotifications = async () => {
  try {
    // 🧮 Low stock check
    const lowStockProducts = await Product.find({ stockQuantity: { $lt: 5 } });

    for (const product of lowStockProducts) {
      await Notification.create({
        recipient: product.vendorId,
        recipientType: "Vendor",
        title: "Low Stock Alert",
        message: `Your product "${product.name}" is running low on stock (${product.stockQuantity} remaining).`,
        type: "Stock",
      });
    }

    // 📦 Order-related notifications could be triggered elsewhere:
    // - New Order: in order creation controller
    // - Order Delivered: in vendor order controller
    // - Order Cancelled: in cancellation logic

  } catch (err) {
    console.error("Auto Notification Trigger Error:", err);
  }
};

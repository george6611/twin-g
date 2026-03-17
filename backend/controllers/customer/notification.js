const Notification = require("../../models/Notifications");
const Order = require("../../models/Order");
const Vendor = require("../../models/Vendor");
const Rider = require("../../models/Rider");
const Customer = require("../../models/Customer");

/**
 * ✅ Utility: Create Notification
 * Reusable across modules — for customer, vendor, or rider
 */
const sendNotification = async ({ recipient, title, message, type, data }) => {
  try {
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type, // e.g. "order_update", "payment", "system", "delivery_status"
      data, // optional: { orderId, riderId, etc. }
    });
    return notification;
  } catch (err) {
    console.error("Notification creation error:", err);
  }
};

// ---------------------- GET NOTIFICATIONS ----------------------
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .populate("data.orderId", "total status")
      .populate("data.riderId", "fullName");
    res.status(200).json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

// ---------------------- MARK AS READ ----------------------
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { status: "read" },
      { new: true }
    );

    if (!notification)
      return res.status(404).json({ message: "Notification not found" });

    res.status(200).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error marking as read" });
  }
};

// ---------------------- DELETE NOTIFICATION ----------------------
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });

    if (!deleted)
      return res.status(404).json({ message: "Notification not found" });

    res.status(200).json({ message: "Notification deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting notification" });
  }
};

// ---------------------- EVENT HOOKS (for other controllers) ----------------------
/**
 * Called when a new order is placed by a customer
 */
const notifyVendorOfNewOrder = async (orderId) => {
  const order = await Order.findById(orderId).populate("vendor customer");
  if (!order) return;

  const vendorUser = await Vendor.findById(order.vendor);
  if (vendorUser) {
    await sendNotification({
      recipient: vendorUser.userId,
      title: "New Order Received",
      message: `You have received a new order (#${order._id}) from ${order.customer.fullName}.`,
      type: "order_update",
      data: { orderId },
    });
  }
};

/**
 * Called when an order status changes (vendor -> customer)
 */
const notifyCustomerOfOrderUpdate = async (orderId, status) => {
  const order = await Order.findById(orderId).populate("customer vendor");
  if (!order) return;

  const customer = await Customer.findById(order.customer);
  if (customer) {
    await sendNotification({
      recipient: customer.userId,
      title: "Order Update",
      message: `Your order (#${order._id}) is now ${status}.`,
      type: "order_update",
      data: { orderId },
    });
  }
};

/**
 * Called when a rider picks or completes a delivery
 */
const notifyDeliveryStatus = async (orderId, riderId, status) => {
  const order = await Order.findById(orderId).populate("customer");
  if (!order) return;

  await sendNotification({
    recipient: order.customer.userId,
    title: "Delivery Update",
    message:
      status === "delivering"
        ? "Your order is now out for delivery!"
        : "Your order has been delivered successfully.",
    type: "delivery_status",
    data: { orderId, riderId },
  });
};

module.exports = {
  getNotifications,
  markAsRead,
  deleteNotification,
  sendNotification,
  notifyVendorOfNewOrder,
  notifyCustomerOfOrderUpdate,
  notifyDeliveryStatus,
};

// controllers/vendor/orders.js
const Order = require("../../models/Order");
const Notification = require("../../models/Notifications");
const {initAgenda,getAgenda} = require("../../utils/agenda") 

// 🔔 Helper to create notifications
const sendNotification = async ({
  recipientId,
  title,
  message,
  type,
  relatedId,
  relatedModel,
  userType = "vendor",
}) => {
  try {
    await Notification.create({
      userId: recipientId || null,
      userType,
      title,
      message,
      type,
      relatedId,
      relatedModel,
      isRead: false,
      status: "pending",
      delivery: { inApp: "pending", push: "pending", email: "pending", sms: "pending" },
    });
  } catch (err) {
    console.error("Notification creation failed:", err);
  }
};

// 🟣 Get all vendor orders
exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?.id;

    const orders = await Order.find({ vendorId })
      .populate("customerId", "fullName phone email address")
      .populate("riderId", "fullName phone vehicleType vehicleNumber")
      .populate("items.productId", "name price image")
      .populate("payment", "method status amount reference")
      .populate("delivery", "status currentLocation eta")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, message: "Vendor orders fetched successfully", orders });
  } catch (err) {
    console.error("Get vendor orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🔵 Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?.id;
    const order = await Order.findById(req.params.id)
      .populate("customerId", "fullName phone email address")
      .populate("vendorId", "shopName contact userId location")
      .populate("riderId", "fullName phone vehicleType vehicleNumber")
      .populate("items.productId", "name price image")
      .populate("payment", "method status amount reference")
      .populate("delivery", "status currentLocation eta updatedAt")
      .lean();

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.vendorId?._id?.toString() !== vendorId.toString())
      return res.status(403).json({ success: false, message: "Unauthorized: This order doesn't belong to you" });

    res.json({
      success: true,
      message: "Order details fetched successfully",
      order,
      currentStatus: order.status,
      statusHistory: order.statusHistory || [],
    });
  } catch (err) {
    console.error("Get order by ID error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟡 Update order status


exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const vendorId = req.vendor?._id || req.user?.id;

    const allowedStatuses = ["pending", "confirmed", "preparing", "ready", "cancelled"];
    if (!allowedStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });

    const order = await Order.findById(id)
      .populate("customerId", "userId fullName")
      .populate("vendorId", "shopName userId location");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.vendorId?._id?.toString() !== vendorId.toString())
      return res.status(403).json({ success: false, message: "Unauthorized vendor access" });

    // update status
    order.status = status;
    order.statusHistory.push({ status, changedAt: new Date(), changedBy: "vendor" });
    await order.save();

    // Notify customer
    await sendNotification({
      recipientId: order.customerId?.userId,
      title: "📦 Order Update",
      message: `Your order #${order._id} is now "${status}".`,
      type: "order_update",
      relatedId: order._id,
      relatedModel: "Order",
      userType: "customer",
    });

    // Notify closest riders if order is ready
    if (status === "ready") {
      const { getAgenda } = require("../../utils/agenda");
      const agenda = getAgenda();

      if (agenda) {
        // Schedule the Agenda job immediately
        await agenda.now("notify-riders", { orderId: order._id, attempt: 0 });
        console.log(`✅ Rider notification job scheduled for order ${order._id}`);
      } else {
        console.error("❌ Agenda instance not available");
      }
    }

    res.json({ success: true, message: `Order updated to ${status}`, order });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


// 🧾 Get vendor order summary
exports.getOrderSummary = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?.id;

    // Total orders
    const totalOrders = await Order.countDocuments({ vendorId });

    // Completed orders: delivered + refunded
    const completedOrders = await Order.countDocuments({
      vendorId,
      status: { $in: ["delivered", "refunded"] },
    });

    // Pending orders: all statuses that are "active" or not completed/cancelled
    const pendingOrders = await Order.countDocuments({
      vendorId,
      status: {
        $in: ["pending", "awaiting_payment", "confirmed", "preparing", "ready", "picked", "in_transit"],
      },
    });

    // Total revenue: sum of delivered orders only
    const totalRevenueAgg = await Order.aggregate([
      { $match: { vendorId, status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Fetch the most recent 7 orders (regardless of status)
    const recentOrders = await Order.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("customerId", "fullName phone email address")
      .populate("riderId", "fullName phone vehicleType vehicleNumber")
      .populate("items.productId", "name price image")
      .populate("payment", "method status amount reference")
      .populate("delivery", "status currentLocation eta")
      .lean();

    res.json({
      success: true,
      message: "Vendor order summary fetched",
      summary: { totalOrders, completedOrders, pendingOrders, totalRevenue },
      recentOrders, // include recent orders in the response
    });
  } catch (err) {
    console.error("Order summary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



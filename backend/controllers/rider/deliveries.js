const Order = require("../../models/Order");
const Delivery = require("../../models/Delivery");
const Notification = require("../../models/Notifications");
const VendorPayout = require("../../models/vendorPayout");
const Payment = require("../../models/Payment");
const Rider = require("../../models/Rider");

const ensureActiveRider = async (riderId) => {
  if (!riderId) return { ok: false, message: "Rider not found" };
  const riderProfile = await Rider.findById(riderId).select("status");
  if (!riderProfile) return { ok: false, message: "Rider profile not found" };
  if (riderProfile.status !== "active") {
    return {
      ok: false,
      message: "Rider account is not active. Complete onboarding to access delivery orders.",
    };
  }
  return { ok: true };
};

// 🟢 Get deliveries assigned to this rider
exports.getAssignedDeliveries = async (req, res) => {
  try {
    const riderId = req.rider?._id || req.user?._id;

    const deliveries = await Order.find({ riderId })
      .sort({ createdAt: -1 })
      .populate("customerId", "name phone")
      .populate("vendorId", "shopName");

    res.json({ success: true, deliveries });
  } catch (err) {
    console.error("Error fetching assigned deliveries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🚀 Combined dashboard data (assigned + available)
exports.getRiderDashboard = async (req, res) => {
  try {
    const riderId = req.rider?._id || req.user?._id;
    console.log("👉 riderId:", riderId);

    const activeCheck = await ensureActiveRider(riderId);
    if (!activeCheck.ok) {
      return res.status(403).json({ success: false, message: activeCheck.message });
    }

    const assigned = await Order.find({ riderId })
      .sort({ createdAt: -1 })
      .populate("customerId", "name phone")
      .populate("vendorId", "shopName location")
      .lean();

    const available = await Order.find({
      status: "ready",
      $or: [{ riderId: null }, { riderId: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .populate("vendorId", "shopName location")
      .populate("customerId", "name address")
      .lean();

    console.log("✅ Assigned:", Array.isArray(assigned), assigned.length);
    console.log("✅ Available:", Array.isArray(available), available.length);

    return res.json({
      success: true,
      assigned: assigned || [],
      available: available || [],
    });
  } catch (err) {
    console.error("❌ Dashboard fetch error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};



// 🟢 Get available deliveries (Ready orders, not yet taken)
exports.getAvailableDeliveries = async (req, res) => {
  try {
    const riderId = req.rider?._id || req.user?._id;
    const activeCheck = await ensureActiveRider(riderId);
    if (!activeCheck.ok) {
      return res.status(403).json({ success: false, message: activeCheck.message });
    }

    const available = await Order.find({
      status: "ready",
      $or: [{ riderId: null }, { riderId: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .populate("vendorId", "shopName location")
      .populate("customerId", "name address");

    res.json({ success: true, available });
  } catch (err) {
    console.error("Error fetching available deliveries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟡 Rider accepts a delivery
const agenda = require("../../utils/agenda"); // your Agenda instance
const sendNotification = require("../../utils/notifyUtils");

exports.acceptDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const riderId = req.rider?._id || req.user?._id;

    const activeCheck = await ensureActiveRider(riderId);
    if (!activeCheck.ok) {
      return res.status(403).json({ success: false, message: activeCheck.message });
    }

    // Find order that is ready and not yet assigned
    const order = await Order.findOne({
      _id: orderId,
      status: "ready",
      $or: [{ riderId: null }, { riderId: { $exists: false } }],
    });

    if (!order)
      return res.status(404).json({
        success: false,
        message: "Order not available or already taken",
      });

    // Assign rider and update order status
    order.riderId = riderId;
    order.status = "picked";
    order.statusHistory.push({
      status: "picked",
      changedAt: new Date(),
      changedBy: riderId,
    });
    await order.save();

    // Update rider availabilityStatus to busy
    const rider = await Rider.findById(riderId);
    if (rider) {
      rider.availabilityStatus = "busy";
      await rider.save();
    }

    // Cancel any pending rider notifications for this order
    await Notification.updateMany(
      {
        relatedId: order._id,
        type: "delivery_available",
        status: "pending",
        userType: "rider",
      },
      { status: "cancelled" }
    );

    // Create or update delivery record
    await Delivery.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        riderId,
        status: "picked",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Populate rider info for notification
    const riderInfo = await Rider.findById(riderId).select("fullName phone vehicleNumber");

    // Notify customer with rider details
    await sendNotification({
      recipientId: order.customerId,
      userType: "customer",
      title: "🚴 Rider Assigned to Your Order",
      message: `${riderInfo?.fullName} (${riderInfo?.vehicleNumber}) is picking up your order #${order._id}. Contact: ${riderInfo?.phone}`,
      type: "delivery_update",
      relatedId: order._id,
      relatedModel: "Order",
    });

    // Notify vendor that rider has accepted
    await sendNotification({
      recipientId: order.vendorId,
      userType: "vendor",
      title: "🚴 Rider Assigned",
      message: `Rider ${riderInfo?.fullName} has accepted order #${order._id} for delivery.`,
      type: "delivery_update",
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.json({
      success: true,
      message: "Delivery accepted successfully",
      order,
      rider: {
        id: rider._id,
        availabilityStatus: rider.availabilityStatus,
      },
    });
  } catch (err) {
    console.error("Error accepting delivery:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// 🟢 Update delivery status (picked, in_transit, delivered)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;
    const riderId = req.rider?._id || req.user?._id;

    const allowedStatuses = ["picked", "in_transit", "delivered"];
    if (!allowedStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });

    const order = await Order.findById(deliveryId)
      .populate("customerId", "name")
      .populate("vendorId", "shopName");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.riderId?.toString() !== riderId.toString())
      return res.status(403).json({ success: false, message: "Not authorized for this delivery" });

    // Update order status
    order.status = status;
    order.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: riderId,
    });
    await order.save();

    // Update delivery record
    await Delivery.findOneAndUpdate(
      { orderId: order._id },
      { status, updatedAt: new Date() },
      { new: true }
    );

    // Notifications
    await Notification.create([
      {
        userId: order.customerId,
        relatedId: order._id,
        relatedModel: "Order",
        type: "delivery_update",
        title: "Delivery Status Updated",
        message: `Your order is now "${status}".`,
        channels: { inApp: true, push: true },
        status: "sent",
        sentAt: new Date(),
      },
      {
        userId: order.vendorId,
        relatedId: order._id,
        relatedModel: "Order",
        type: "delivery_update",
        title: "Delivery Progress",
        message: `Rider updated order #${order._id} to "${status}".`,
        channels: { inApp: true },
        status: "sent",
        sentAt: new Date(),
      },
    ]);

    // Vendor payout if delivered
    if (status === "delivered") {
      const existingPayout = await VendorPayout.findOne({ order: order._id });
      if (!existingPayout) {
        const payment = await Payment.findOne({ orderId: order._id });
        const totalAmount = payment?.amount || order.totalAmount || 0;
        const commission = totalAmount * 0.1;
        const netAmount = totalAmount - commission;

        await VendorPayout.create({
          vendor: order.vendorId,
          order: order._id,
          payment: payment?._id,
          amount: totalAmount,
          commission,
          netAmount,
          status: "pending",
          paymentMethod: payment?.method || "mpesa",
        });
      }
    }

    // 🔹 Auto-switch rider back to available if no active orders
    if (status === "delivered") {
      const activeOrders = await Order.countDocuments({
        riderId,
        status: { $in: ["picked", "in_transit"] },
      });

      if (activeOrders === 0) {
        const rider = await Rider.findById(riderId);
        if (rider) {
          rider.availabilityStatus = "available";
          rider.onlineSince = new Date();
          await rider.save();
          console.log(`Rider ${riderId} status auto-set to available`);
        }
      }
    }

    res.json({
      success: true,
      message: `Order status updated to "${status}"`,
      order,
    });
  } catch (err) {
    console.error("Error updating delivery status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🟢 Delivery summary for dashboard
exports.getDeliveriesSummary = async (req, res) => {
  try {
    const riderId = req.rider?._id || req.user?._id;
    const counts = await Order.aggregate([
      { $match: { riderId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const summary = { picked: 0, in_transit: 0, delivered: 0 };
    counts.forEach((c) => {
      if (summary.hasOwnProperty(c._id)) summary[c._id] = c.count;
    });

    res.json({ success: true, summary });
  } catch (err) {
    console.error("Error fetching delivery summary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 🕒 Recent deliveries
exports.getRecentDeliveries = async (req, res) => {
  try {
    const recent = await Order.find({ riderId: req.rider?._id || req.user?._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("customerId", "name")
      .select("customerId status delivery.address createdAt");

    const formatted = recent.map((o) => ({
      id: o._id,
      customer: o.customerId?.name,
      status: o.status,
      address: o.delivery?.address,
      createdAt: o.createdAt,
    }));

    res.json({ success: true, recent: formatted });
  } catch (err) {
    console.error("Error fetching recent deliveries:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const mongoose = require("mongoose");
const Order = require("../../models/Order");
const Vendor = require("../../models/Vendor");
const Notification = require("../../models/Notifications");
const calculateDistanceKm = require("../../utils/distance");
const calculateShippingFee = require("../../utils/calculateShipping");

// Helper: send notification
const sendNotification = async ({
  recipientId,
  title,
  message,
  type,
  relatedId,
  relatedModel,
  userType = "customer",
}) => {
  try {
    await Notification.create({
      userId: recipientId,
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

// 🟢 PLACE ORDER (same as before)
const placeOrder = async (req, res) => {
  try {
    const { items, vendorId, deliveryAddress, paymentMethod } = req.body;

    if (!items?.length)
      return res.status(400).json({ success: false, message: "No items in order" });
    if (!mongoose.Types.ObjectId.isValid(vendorId))
      return res.status(400).json({ success: false, message: "Invalid vendorId" });
    if (!deliveryAddress?.latitude || !deliveryAddress?.longitude)
      return res.status(400).json({ success: false, message: "Delivery location required" });

    const vendor = await Vendor.findById(vendorId);
    if (!vendor?.address?.latitude || !vendor?.address?.longitude)
      return res.status(400).json({ success: false, message: "Vendor location invalid" });

    const distanceKm = calculateDistanceKm(
      vendor.address.latitude,
      vendor.address.longitude,
      deliveryAddress.latitude,
      deliveryAddress.longitude
    );

    const deliveryFee = calculateShippingFee(distanceKm, { baseFee: 0, perKmFee: 50 });

    let subtotal = 0;
    const processedItems = items.map((item) => {
      const total = (item.price - (item.discount || 0)) * item.quantity;
      subtotal += total;
      return { ...item, total };
    });

    const totalAmount = subtotal;

    const order = await Order.create({
      customerId: req.user._id,
      vendorId,
      riderId: null,
      items: processedItems,
      subtotal,
      totalDiscount: 0,
      totalAmount,
      payment: { method: paymentMethod || "mpesa", status: "pending", transactionId: null, amountPaid: 0 },
      delivery: {
        address: {
          label: deliveryAddress.label || "Delivery Location",
          street: deliveryAddress.street || "",
          city: deliveryAddress.city || "",
          region: deliveryAddress.region || "",
          description: deliveryAddress.description || "",
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude,
        },
        distanceKm,
        deliveryFee,
        instructions: deliveryAddress.instructions || "",
      },
      status: "awaiting_payment",
      statusHistory: [{ status: "awaiting_payment", changedAt: new Date(), changedBy: req.user._id }],
    });

    // Notify Vendor
    if (vendor?.userId) {
      await sendNotification({
        recipientId: vendor.userId,        userType: "vendor",        title: "🛍️ New Order Received",
        message: `You’ve received a new order (#${order._id}).`,
        type: "order_update",
        relatedId: order._id,
        relatedModel: "Order",
      });
    }

    // Notify Customer
    await sendNotification({
      recipientId: req.user._id,
      userType: "customer",
      title: "✅ Order Placed",
      message: "Your order has been placed successfully. Awaiting payment.",
      type: "order_confirmation",
      relatedId: order._id,
      relatedModel: "Order",
    });

    res.status(201).json({ success: true, message: "Order placed successfully", order });
  } catch (err) {
    console.error("❌ Error placing order:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟣 GET MY ORDERS (with pagination, filtering & search)
const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, timeRange, search } = req.query;

    const query = { customerId: req.user._id };

    // Filter by status
    if (status) {
      const statuses = status.split(","); // support multiple
      query.status = { $in: statuses };
    }

    // Filter by time ranges
    if (timeRange) {
      const now = new Date();
      let start, end = now;
      switch (timeRange) {
        case "today":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "yesterday":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "last7days":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case "thisMonth":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "lastMonth":
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "thisYear":
          start = new Date(now.getFullYear(), 0, 1);
          break;
      }
      if (start) query.createdAt = { $gte: start, $lte: end };
    }

    // Optional search by vendor name
    if (search) {
      const vendors = await Vendor.find({ shopName: { $regex: search, $options: "i" } }).select("_id");
      const vendorIds = vendors.map((v) => v._id);
      query.vendorId = { $in: vendorIds };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate("vendorId", "shopName shopLogo contact")
      .populate("riderId", "fullName vehicleType phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      orders,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalOrders / parseInt(limit)),
      totalOrders,
    });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟡 GET ORDER DETAILS
const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id })
      .populate("vendorId", "shopName shopLogo contact")
      .populate("riderId", "fullName phone vehicleType")
      .lean();

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({
      success: true,
      order,
      currentStatus: order.status,
      statusHistory: order.statusHistory || [],
    });
  } catch (err) {
    console.error("❌ Error fetching order details:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟢 GET ACTIVE (ONGOING) ORDERS WITH LOCATION (unchanged)
const getActiveOrders = async (req, res) => {
  try {
    const activeOrders = await Order.find({
      customerId: req.user._id,
      status: { $nin: ["delivered", "completed", "cancelled"] },
    })
      .populate("vendorId", "shopName shopLogo contact location")
      .populate("riderId", "fullName phone vehicleType currentLocation")
      .sort({ createdAt: -1 })
      .lean();

    const enhancedOrders = activeOrders.map((order) => {
      let currentLocation = null;
      if (["in_transit", "picked"].includes(order.status)) {
        currentLocation = order.riderId?.currentLocation || order.tracking?.[order.tracking.length - 1]?.location || null;
      } else {
        currentLocation = order.vendorId?.location || order.tracking?.[order.tracking.length - 1]?.location || null;
      }
      return { ...order, currentLocation };
    });

    res.json({ success: true, activeOrders: enhancedOrders });
  } catch (err) {
    console.error("❌ Error fetching active orders:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderDetails,
  getActiveOrders,
};

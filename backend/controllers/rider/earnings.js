const Order = require("../../models/Order");

// 🧾 Rider earnings controller
exports.getEarnings = async (req, res) => {
  try {
    const riderId = req.user?._id || req.rider?._id;

    if (!riderId) {
      return res.status(401).json({ message: "Unauthorized or invalid rider" });
    }

    const { period } = req.query;
    const now = new Date();
    let dateFilter = {};

    switch (period) {
      case "day":
        dateFilter = { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
        break;
      case "week":
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: lastWeek } };
        break;
      case "month":
        dateFilter = {
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        };
        break;
      default:
        dateFilter = {};
    }

    // 🧾 Find delivered orders for this rider
    const deliveredOrders = await Order.find({
      riderId,
      status: "delivered",
      ...dateFilter,
    })
      .sort({ createdAt: -1 })
      // ✅ Safe population — ignores missing paths
      .populate({
        path: "customerId",
        select: "name phone",
        strictPopulate: false,
      })
      .populate({
        path: "vendorId",
        select: "shopName",
        strictPopulate: false,
      });

    if (!deliveredOrders?.length) {
      return res.json({
        success: true,
        totalEarnings: 0,
        deliveredOrdersCount: 0,
        period: period || "all",
        breakdown: [],
      });
    }

    const totalEarnings = deliveredOrders.reduce(
      (sum, order) => sum + (order.delivery?.deliveryFee || 0),
      0
    );

    const breakdown = deliveredOrders.map(order => ({
      id: order._id,
      vendor:
        order.vendorId?.shopName ||
        order.vendor?.shopName ||
        "Unknown Vendor",
      customer:
        order.customerId?.name ||
        order.customer?.name ||
        "Unknown Customer",
      amount: order.totalAmount || 0,
      earning: order.delivery?.deliveryFee || order.totalAmount * 0.1 || 0,
      status: order.status,
      date: order.createdAt,
    }));

    res.json({
      success: true,
      totalEarnings,
      deliveredOrdersCount: deliveredOrders.length,
      period: period || "all",
      breakdown,
    });
  } catch (err) {
    console.error("🔥 Rider earnings error:", err);
    res.status(500).json({
      message: "Failed to fetch earnings",
      error: err.message,
    });
  }
};

const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Payment = require("../../models/Payment");

/**
 * 📈 SALES ANALYTICS — total sales, revenue trend, etc.
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const vendor = req.vendor?._id || req.user?._id;
    if (!vendor)
      return res.status(403).json({ message: "Forbidden: missing vendor/user context" });

    // Total revenue
    const totalRevenueAgg = await Payment.aggregate([
      { $match: { vendor, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Sales trend for last 30 days
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const trend = await Payment.aggregate([
      {
        $match: {
          vendor,
          status: "completed",
          createdAt: { $gte: last30Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, totalRevenue, trend });
  } catch (err) {
    console.error("Sales analytics error:", err);
    res.status(500).json({ success: false, message: "Failed to load sales analytics" });
  }
};

/**
 * 📊 PRODUCT ANALYTICS — total products, stock, top sellers
 */
exports.getProductAnalytics = async (req, res) => {
  try {
    const vendor = req.vendor?._id || req.user?._id;
    if (!vendor)
      return res.status(403).json({ message: "Forbidden: missing vendor/user context" });

    const totalProducts = await Product.countDocuments({ vendor });
    const lowStock = await Product.find({ vendor, stock: { $lt: 5 } }).select("name stock");

    const topProducts = await Order.aggregate([
      { $match: { vendor } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          totalSold: 1,
          stock: "$product.stock",
        },
      },
    ]);

    res.json({ success: true, totalProducts, lowStock, topProducts });
  } catch (err) {
    console.error("Product analytics error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch product analytics" });
  }
};

/**
 * 🧠 PERFORMANCE OVERVIEW — combined dashboard summary
 */
exports.getPerformanceOverview = async (req, res) => {
  try {
    const vendor = req.vendor?._id || req.user?._id;
    if (!vendor)
      return res.status(403).json({ message: "Forbidden: missing vendor/user context" });

    const [totalOrders, totalProducts, payments, recentOrders] = await Promise.all([
      Order.countDocuments({ vendor }),
      Product.countDocuments({ vendor }),
      Payment.aggregate([
        { $match: { vendor, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Order.find({ vendor })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customer", "name")
        .populate("items.product", "name"),
    ]);

    res.json({
      success: true,
      totalOrders,
      totalProducts,
      totalRevenue: payments[0]?.total || 0,
      recentOrders,
    });
  } catch (err) {
    console.error("Performance overview error:", err);
    res.status(500).json({ success: false, message: "Failed to load performance overview" });
  }
};

/**
 * 💰 EARNINGS ANALYTICS — total and daily revenue trends
 */
exports.getEarningsAnalytics = async (req, res) => {
  try {
    const vendor = req.vendor?._id || req.user?._id;
    if (!vendor)
      return res.status(403).json({ message: "Forbidden: missing vendor/user context" });

    const totalPaymentsAgg = await Payment.aggregate([
      { $match: { vendor, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalEarnings = totalPaymentsAgg[0]?.total || 0;

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const trend = await Payment.aggregate([
      {
        $match: {
          vendor,
          status: "completed",
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyEarnings: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, totalEarnings, trend });
  } catch (err) {
    console.error("Earnings analytics error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch earnings analytics" });
  }
};

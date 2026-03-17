const VendorPayout = require("../../models/VendorPayout");
const Payment = require("../../models/Payment");
const Order = require("../../models/Order");
const Notification = require("../../models/Notifications");

// 🟣 Get all vendor payments
exports.getVendorPayments = async (req, res) => {
  try {
    const vendorId = req.vendor?._id;
    const payments = await Payment.find({ vendor: vendorId })
      .populate("order", "orderNumber totalAmount orderStatus")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Vendor payments fetched successfully",
      payments,
    });
  } catch (err) {
    console.error("Get vendor payments error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payments",
      error: err.message,
    });
  }
};

// 🔵 Get specific payment
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("order", "orderNumber totalAmount orderStatus")
      .populate("vendor", "businessName");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      message: "Payment details fetched successfully",
      payment,
    });
  } catch (err) {
    console.error("Get payment by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payment details",
      error: err.message,
    });
  }
};

// 🟢 Auto payout (triggered manually or via CRON)
exports.triggerAutoPayout = async (req, res) => {
  try {
    const vendorId = req.vendor?._id;

    // Find all delivered orders with unpaid vendor payout
    const pendingOrders = await Order.find({
      vendor: vendorId,
      orderStatus: "Delivered",
      payoutStatus: { $ne: "Paid" },
    });

    if (!pendingOrders.length) {
      return res.json({
        success: true,
        message: "No pending payouts found for this vendor.",
      });
    }

    let totalPayout = 0;
    const payoutRecords = [];

    for (const order of pendingOrders) {
      const platformFee = Math.round(order.totalAmount * 0.05); // 5% platform fee
      const vendorNet = order.totalAmount - platformFee;

      totalPayout += vendorNet;

      // ✅ Create Payment record
      const payment = await Payment.create({
        order: order._id,
        vendor: vendorId,
        amount: vendorNet,
        method: "Mobile Transfer",
        status: "Completed",
        reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      });

      // ✅ Create VendorPayout record
      const vendorPayout = await VendorPayout.create({
        vendor: vendorId,
        order: order._id,
        payment: payment._id,
        grossAmount: order.totalAmount,
        fees: platformFee,
        netAmount: vendorNet,
        status: "paid",
        payoutDate: new Date(),
        reference: `VENDOR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      });

      payoutRecords.push(vendorPayout);

      // ✅ Mark order as paid out
      order.payoutStatus = "Paid";
      await order.save();

      // ✅ Notify vendor
      await Notification.create({
        recipient: vendorId,
        recipientType: "Vendor",
        title: "Payout Received",
        message: `You have been paid KES ${vendorNet.toLocaleString()} for Order #${order._id}.`,
        type: "Payment",
      });
    }

    res.json({
      success: true,
      message: "Automatic vendor payout completed successfully",
      totalPaid: totalPayout,
      count: pendingOrders.length,
      records: payoutRecords,
    });
  } catch (err) {
    console.error("Auto payout error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during automatic payout",
      error: err.message,
    });
  }
};

// 💰 Get payout summary
exports.getPayoutSummary = async (req, res) => {
  try {
    const vendorId = req.vendor?._id;

    const totalEarningsAgg = await VendorPayout.aggregate([
      { $match: { vendor: vendorId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);

    const pendingAgg = await VendorPayout.aggregate([
      { $match: { vendor: vendorId, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);

    const summary = {
      totalPaid: totalEarningsAgg[0]?.total || 0,
      totalPending: pendingAgg[0]?.total || 0,
    };

    res.json({
      success: true,
      message: "Vendor payout summary fetched successfully",
      summary,
    });
  } catch (err) {
    console.error("Get payout summary error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payout summary",
      error: err.message,
    });
  }
};

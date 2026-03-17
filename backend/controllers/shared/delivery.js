const Delivery = require("../../models/Delivery");
const Order = require("../../models/Order");
const Rider = require("../../models/Rider");

exports.createDelivery = async (req, res) => {
  try {
    const { orderId, riderId, pickupAddress, dropoffAddress } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const delivery = await Delivery.create({
      orderId,
      vendorId: order.vendor,
      customerId: order.customer,
      riderId,
      pickupAddress,
      dropoffAddress,
      status: "pending",
    });

    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      id,
      { status, deliveredAt: status === "delivered" ? new Date() : undefined },
      { new: true }
    );

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate("orderId")
      .populate("riderId", "name phone")
      .populate("customerId", "name")
      .populate("vendorId", "shopName");
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

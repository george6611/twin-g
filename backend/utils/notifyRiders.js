const Rider = require("../models/Rider");
const Notification = require("../models/Notifications");
const Order = require("../models/Order");

// Haversine formula to calculate distance
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = function defineNotifyRidersJob(agenda, io) {
  agenda.define("notify-riders", async (job) => {
    const { orderId, attempt = 0 } = job.attrs.data;
    const order = await Order.findById(orderId).populate("vendorId");
    if (!order || order.riderId) return; // Stop if order no longer exists or is accepted

    const vendorLocation = order.vendorId.location;
    if (!vendorLocation) return;

    const allRiders = await Rider.find({ status: "active" }).lean();

    const sortedRiders = allRiders
      .map((r) => ({
        ...r,
        distance: getDistance(
          vendorLocation.latitude,
          vendorLocation.longitude,
          r.location.latitude,
          r.location.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    // Retry configuration
    const riderCounts = [3, 3, 4, 4, 5]; // Riders per attempt
    const retryIntervals = [3, 3, 5, 5, 5]; // Minutes

    const count = riderCounts[attempt] || 5; // Default 5 riders
    const targetRiders = sortedRiders.slice(0, count);

    for (const rider of targetRiders) {
      const notification = await Notification.create({
        userId: rider._id,
        userType: "rider",
        title: "🚚 New Delivery Available",
        message: `Order #${order._id} from ${order.vendorId.shopName} is ready for pickup.`,
        type: "delivery_available",
        relatedId: order._id,
        relatedModel: "Order",
        isRead: false,
        status: "pending",
        channels: { inApp: true, push: true },
      });

      // Emit via WebSocket if you have io instance
      if (io) {
        io.to(rider._id.toString()).emit("new-notification", notification);
      }
    }

    // Schedule next attempt if max attempts not reached
    if (attempt + 1 < riderCounts.length) {
      await agenda.schedule(
        `${retryIntervals[attempt]} minutes`,
        "notify-riders",
        { orderId: order._id, attempt: attempt + 1 }
      );
    }
  });
};

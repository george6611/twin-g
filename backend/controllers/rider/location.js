// backend/controllers/rider/location.js
const Rider = require("../../models/Rider");
const Order = require("../../models/Order");
const mongoose = require("mongoose");
const {
  calculateDistance,
  isValidCoordinates,
  createTrackingPayload,
  hasSignificantMove,
} = require("../../utils/locationHelper");

/**
 * Update rider's real-time location
 * Also updates order tracking history
 * Emits via Socket.IO for real-time customer view
 */
exports.updateRiderLocation = async (req, res) => {
  try {
    const riderId = req.rider?._id || req.user?._id;
    const { latitude, longitude, orderId } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude required",
      });
    }

    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    // Update Rider's current location (GeoJSON format for geospatial queries)
    const rider = await Rider.findByIdAndUpdate(
      riderId,
      {
        currentLocation: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
        },
        onlineSince: new Date(),
      },
      { new: true }
    );

    // If orderId provided, also update Order's tracking history
    if (orderId) {
      const order = await Order.findById(orderId)
        .populate("customerId", "_id")
        .populate("vendorId", "location");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if this is a significant move (> 50 meters) to reduce database writes
      let shouldUpdateTracking = true;
      if (order.tracking.length > 0) {
        const lastTracking = order.tracking[order.tracking.length - 1];
        const lastLat = lastTracking.location?.latitude;
        const lastLon = lastTracking.location?.longitude;

        if (lastLat && lastLon) {
          shouldUpdateTracking = hasSignificantMove(
            lastLat,
            lastLon,
            latitude,
            longitude,
            50
          );
        }
      }

      // Update tracking only if significant movement
      if (shouldUpdateTracking) {
        await Order.updateOne(
          { _id: orderId },
          {
            $push: {
              tracking: {
                timestamp: new Date(),
                location: { latitude, longitude },
                statusNote: "Rider in transit",
              },
            },
          }
        );
      }

      // Emit via Socket.IO for real-time customer tracking
      const io = req.app?.get?.("io");
      if (io && order?.customerId) {
        // Create rich tracking payload with distance, ETA, bearing
        const destination = {
          latitude: order.delivery?.address?.latitude,
          longitude: order.delivery?.address?.longitude,
          address: order.delivery?.address?.label || order.delivery?.address?.street,
        };

        const trackingPayload = createTrackingPayload(
          order,
          rider,
          { latitude, longitude },
          destination
        );

        // Broadcast to the tracking room for this order
        io.to(`tracking_${orderId}`).emit("rider-location-update", trackingPayload);

        // Also notify the customer directly (for failover)
        io.to(order.customerId._id.toString()).emit(
          "rider-location-update",
          trackingPayload
        );
      }

      console.log(
        `📍 Rider location updated for order ${orderId}: [${latitude}, ${longitude}]`
      );
    }

    res.json({
      success: true,
      message: "Location updated",
      rider: {
        id: rider._id,
        location: {
          latitude,
          longitude,
        },
        status: rider.availabilityStatus,
      },
    });
  } catch (err) {
    console.error("❌ Error updating rider location:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: err.message,
    });
  }
};

/**
 * Get rider's current location
 */
exports.getRiderLocation = async (req, res) => {
  try {
    const riderId = req.rider?._id || req.user?._id;

    const rider = await Rider.findById(riderId).select(
      "currentLocation fullName phoneNumber vehicleNumber"
    );

    if (!rider || !rider.currentLocation?.coordinates) {
      return res.status(404).json({
        success: false,
        message: "Location not available",
      });
    }

    const [longitude, latitude] = rider.currentLocation.coordinates;

    res.json({
      success: true,
      location: {
        latitude,
        longitude,
        riderName: rider.fullName,
        riderPhone: rider.phoneNumber,
        riderVehicle: rider.vehicleNumber,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching rider location:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch location",
      error: err.message,
    });
  }
};

/**
 * Get full tracking history for a delivery
 * Includes all location points and timestamps
 */
exports.getDeliveryTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.rider?._id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(orderId)
      .populate("riderId", "fullName phoneNumber vehicleNumber currentLocation")
      .populate("customerId", "fullName")
      .populate("vendorId", "shopName location");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify access: rider or customer
    if (
      order.riderId?._id?.toString() !== userId?.toString() &&
      order.customerId?._id?.toString() !== userId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this tracking",
      });
    }

    // Get current rider location
    let currentRiderLocation = null;
    if (order.riderId?.currentLocation?.coordinates) {
      const [lon, lat] = order.riderId.currentLocation.coordinates;
      currentRiderLocation = { latitude: lat, longitude: lon };
    }

    // Get all tracking points
    const trackingHistory = order.tracking.map((t) => ({
      timestamp: t.timestamp,
      location: t.location,
      note: t.statusNote,
    }));

    // Get destination
    const destination = {
      latitude: order.delivery?.address?.latitude,
      longitude: order.delivery?.address?.longitude,
      address: order.delivery?.address?.label || order.delivery?.address?.street,
    };

    // Get vendor location
    const vendorLocation = {
      latitude: order.vendorId?.location?.latitude,
      longitude: order.vendorId?.location?.longitude,
    };

    // Calculate distance from current location to destination
    let distanceRemaining = null;
    if (currentRiderLocation && destination.latitude && destination.longitude) {
      const distanceKm = calculateDistance(
        currentRiderLocation.latitude,
        currentRiderLocation.longitude,
        destination.latitude,
        destination.longitude
      );
      distanceRemaining = Math.round(distanceKm * 1000); // in meters
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        status: order.status,
        riderName: order.riderId?.fullName,
        riderPhone: order.riderId?.phoneNumber,
        riderVehicle: order.riderId?.vehicleNumber,
        customerName: order.customerId?.fullName,
      },
      currentRiderLocation,
      vendorLocation,
      destination,
      distanceRemaining, // in meters
      trackingHistory,
      totalCheckpoints: trackingHistory.length,
    });
  } catch (err) {
    console.error("❌ Error fetching delivery tracking:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking",
      error: err.message,
    });
  }
};

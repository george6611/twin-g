const Rider = require("../../models/Rider");

/**
 * GET /api/rider/status
 * Returns current rider status
 */
exports.getRiderStatus = async (req, res) => {
  try {
    const rider = await Rider.findById(req.user._id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    res.json({
      success: true,
      rider: {
        id: rider._id,
        availabilityStatus: rider.availabilityStatus,
        onlineSince: rider.onlineSince || null,
      },
    });
  } catch (err) {
    console.error("Get Rider Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/rider/status
 * Update rider status (available, busy, offline)
 */
exports.updateRiderStatus = async (req, res) => {
  try {
    const { status, location } = req.body; // optional location

    // Validate status against enum
    const allowedStatuses = ["available", "busy", "offline"];
    if (!status || !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: `Invalid status. Must be one of ${allowedStatuses.join(", ")}` });
    }

    const rider = await Rider.findById(req.user._id);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    // Update availabilityStatus
    rider.availabilityStatus = status.toLowerCase();

    // Update onlineSince only when going available
    rider.onlineSince = status.toLowerCase() === "available" ? new Date() : null;

    // Optional: update location
    if (location?.lat != null && location?.lng != null) {
      rider.currentLocation = {
        type: "Point",
        coordinates: [location.lng, location.lat],
      };
    }

    await rider.save();

    res.json({
      success: true,
      message: `Rider is now ${rider.availabilityStatus}`,
      rider: {
        id: rider._id,
        availabilityStatus: rider.availabilityStatus,
        onlineSince: rider.onlineSince || null,
        location: rider.currentLocation || null,
      },
    });
  } catch (err) {
    console.error("Update Rider Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

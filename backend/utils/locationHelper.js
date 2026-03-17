// backend/utils/locationHelper.js

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate ETA based on distance and average delivery speed
 * Returns time in minutes
 */
function estimateETA(distanceKm, averageSpeedKmh = 30) {
  // Average delivery speed in urban area: 30 km/h
  // Add buffer time for stops, traffic, etc.
  const travelTime = (distanceKm / averageSpeedKmh) * 60; // Convert to minutes
  const bufferTime = 5; // 5 minutes buffer
  return Math.ceil(travelTime + bufferTime);
}

/**
 * Get bearing (direction) between two points
 * Returns bearing in degrees (0-360)
 */
function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = lon2 - lon1;
  const y = Math.sin((dLon * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos((dLon * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Check if location has significantly moved (more than threshold meters)
 * Useful for filtering location updates to reduce network traffic
 */
function hasSignificantMove(
  lat1,
  lon1,
  lat2,
  lon2,
  thresholdMeters = 50
) {
  const distanceMeters = calculateDistance(lat1, lon1, lat2, lon2) * 1000;
  return distanceMeters > thresholdMeters;
}

/**
 * Validate coordinates
 */
function isValidCoordinates(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Convert degrees to cardinal direction
 * e.g., 45 -> "NE", 180 -> "S"
 */
function degreeToDirection(degree) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round((degree % 360) / 22.5);
  return directions[index % 16];
}

/**
 * Create tracking broadcast payload with all useful info
 */
function createTrackingPayload(order, riderData, currentLocation, destinationLocation) {
  const distanceToDestination = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    destinationLocation.latitude,
    destinationLocation.longitude
  );

  const eta = estimateETA(distanceToDestination);
  const bearing = getBearing(
    currentLocation.latitude,
    currentLocation.longitude,
    destinationLocation.latitude,
    destinationLocation.longitude
  );

  return {
    orderId: order._id,
    riderLocation: {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      bearing: bearing,
      direction: degreeToDirection(bearing),
    },
    rider: {
      id: riderData._id,
      name: riderData.fullName,
      phone: riderData.phoneNumber,
      vehicle: riderData.vehicleNumber,
      rating: riderData.rating,
    },
    delivery: {
      status: order.status,
      distanceRemaining: Math.round(distanceToDestination * 1000), // in meters
      estimatedArrival: new Date(Date.now() + eta * 60 * 1000),
      estimatedMinutes: eta,
      destination: {
        latitude: destinationLocation.latitude,
        longitude: destinationLocation.longitude,
        address: destinationLocation.address,
      },
    },
    timestamp: new Date(),
  };
}

module.exports = {
  calculateDistance,
  estimateETA,
  getBearing,
  hasSignificantMove,
  isValidCoordinates,
  degreeToDirection,
  createTrackingPayload,
};

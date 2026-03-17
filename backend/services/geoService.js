// services/geoService.js
const calculateDistanceKm = require("../utils/distance")

function getDistance(customerLocation, vendorLocation) {
  if (!customerLocation || !vendorLocation) return null;
  return calculateDistanceKm(
    customerLocation.latitude,
    customerLocation.longitude,
    vendorLocation.latitude,
    vendorLocation.longitude
  );
}

module.exports = { getDistance };

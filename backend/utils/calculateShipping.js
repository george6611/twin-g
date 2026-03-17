/**
 * Calculates shipping fee based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @param {object} options - Optional parameters
 * @param {number} options.baseFee - Base delivery fee (default 50)
 * @param {number} options.perKmFee - Fee per km (default 50)
 * @param {number} options.minFee - Minimum delivery fee (default 50)
 * @param {number} options.maxFee - Maximum delivery fee (optional)
 * @returns {number} delivery fee in KES
 */
function calculateShippingFee(distanceKm, options = {}) {
  const {
    baseFee = 50,
    perKmFee = 50,
    minFee = 50,
    maxFee
  } = options;

  // Calculate raw fee
  let fee = baseFee + distanceKm * perKmFee;

  // Apply minFee
  if (fee < minFee) fee = minFee;

  // Apply maxFee if defined
  if (typeof maxFee === "number" && fee > maxFee) fee = maxFee;

  // Round to nearest integer
  return Math.round(fee);
}

module.exports = calculateShippingFee;

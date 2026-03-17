const Customer = require("../../models/Customer");
const User = require("../../models/User");

// ---------------------- UPDATE LOCATION (ADD NEW ADDRESS) ----------------------
const updateCustomerLocation = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware
    const { street, city, latitude, longitude } = req.body;

    if (!street || !city || !latitude || !longitude) {
      return res.status(400).json({ message: "All address fields are required." });
    }

    const customer = await Customer.findOne({ userId });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // Create new non-primary address
    const newAddress = {
      label: "Current Location",
      street,
      city,
      latitude,
      longitude,
      isDefault: false, // ensure this is NOT primary
    };

    customer.addresses.push(newAddress);
    await customer.save();

    res.status(200).json({
      message: "Location updated successfully",
      addresses: customer.addresses,
    });

  } catch (err) {
    console.error("Update Location Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { updateCustomerLocation };

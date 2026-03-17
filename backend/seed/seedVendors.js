// seed/seedVendors.js
const Vendor = require("../models/Vendor");
const User = require("../models/User");

module.exports = async function seedVendors(users, categories, count = 50) {
  // Clear old vendors and vendor users
  await Vendor.deleteMany({});
  await User.deleteMany({ role: "vendor" });

  const vendors = [];

  for (let i = 0; i < count; i++) {
    // Create a user first
    const user = await User.create({
      name: `Vendor User ${i + 1}`,
      email: `vendor${i + 1}@test.com`,
      phone: `07000000${i.toString().padStart(2, 2)}`,
      password: "password123",
      role: "vendor",
      isVerified: true,
    });

    // Pick a random category pair
    const pair = categories[i % categories.length];

    const lat = 0.03 + Math.random() * 0.02;
    const lng = 36.35 + Math.random() * 0.02;

    // Create vendor linked to user and category
    const vendor = await Vendor.create({
      userId: user._id,
      shopName: `Vendor Shop ${i + 1}`,
      shopDescription: "Test vendor for scaling",
      address: {
        latitude: lat,
        longitude: lng,
        city: "Nyahururu",
        country: "Kenya",
      },
      categories: [pair.main._id],
      subCategories: [pair.sub._id],
      isVerified: true,
      status: "active",
      isOpen: true,
    });

    vendors.push(vendor);
  }

  return vendors;
};

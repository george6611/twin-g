// seed/seedRun.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");

const seedCategories = require("./seedCategories");
const seedVendors = require("./seedVendors");
const seedProducts = require("./seedProducts");
const syncVendorCategories = require("./syncVendorCategories");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("🌱 Seeding database...");

    // Step 1: Categories
    const categoryPairs = await seedCategories();

    // Step 2: Vendors (with users and categories)
    const vendors = await seedVendors(categoryPairs, categoryPairs, 100);

    // Step 3: Products
    await seedProducts(vendors, 20); // each vendor gets 20 products

    // Step 4: Sync categories on vendors (if needed)
    await syncVendorCategories();

    console.log("✅ Database seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

run();

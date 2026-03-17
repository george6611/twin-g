// scripts/testProductApi.js
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const Category = require("../models/Category");
require("dotenv").config();

async function testProductApi() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get a sample product with vendorId populated
    const product = await Product.findOne()
      .populate("vendorId", "shopName logo location")
      .populate("categoryId", "name");

    if (!product) {
      console.log("❌ No products found in database");
      process.exit(1);
    }

    console.log("📦 Sample Product:");
    console.log("  ID:", product._id);
    console.log("  Name:", product.name);
    console.log("  VendorId (raw):", product.vendorId);
    console.log("  VendorId._id:", product.vendorId?._id);
    console.log("  VendorId.shopName:", product.vendorId?.shopName);
    console.log("\n🔍 Full product object:");
    console.log(JSON.stringify(product.toObject(), null, 2));
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 MongoDB connection closed");
  }
}

testProductApi();

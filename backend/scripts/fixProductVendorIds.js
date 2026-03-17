// scripts/fixProductVendorIds.js
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
require("dotenv").config();

async function fixProductVendorIds() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Count total products
    const totalProducts = await Product.countDocuments();
    console.log(`\n📊 Total products in database: ${totalProducts}`);

    // Find all products without vendorId (checking specifically for null value)
    const productsWithoutVendor = await Product.find({
      vendorId: null,
    });

    console.log(
      `\n📦 Found ${productsWithoutVendor.length} products with vendorId=null`
    );

    // Show a sample if any found
    if (productsWithoutVendor.length > 0) {
      console.log("\n🔍 Sample product without vendor:");
      console.log("  ID:", productsWithoutVendor[0]._id);
      console.log("  Name:", productsWithoutVendor[0].name);
      console.log("  VendorId:", productsWithoutVendor[0].vendorId);
    }

    if (productsWithoutVendor.length === 0) {
      console.log("✅ All products have vendorId. No action needed.");
      process.exit(0);
    }

    // Get first vendor to assign to orphaned products
    const firstVendor = await Vendor.findOne();

    if (!firstVendor) {
      console.log(
        "❌ No vendors found. Please create a vendor first or run seed scripts."
      );
      process.exit(1);
    }

    console.log(
      `\n🏪 Assigning all orphaned products to vendor: ${firstVendor.shopName}`
    );

    // Update all products with vendorId=null
    const result = await Product.updateMany(
      { vendorId: null },
      { $set: { vendorId: firstVendor._id } }
    );

    console.log(
      `\n✅ Updated ${result.modifiedCount} products with vendorId: ${firstVendor._id}`
    );

    // Also update vendor's products array
    const allProductIds = productsWithoutVendor.map((p) => p._id);
    await Vendor.findByIdAndUpdate(firstVendor._id, {
      $addToSet: { products: { $each: allProductIds } },
    });

    console.log(
      `✅ Added ${allProductIds.length} products to vendor's product list`
    );

    console.log("\n🎉 Done! All products now have vendorId.");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 MongoDB connection closed");
  }
}

fixProductVendorIds();

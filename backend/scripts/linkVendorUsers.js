/**
 * Migration script: Link vendor users to their vendor documents
 * Fixes users with role='vendor' that don't have vendorId set
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Vendor = require('../models/Vendor');

async function linkVendorUsers() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('✅ Connected to MongoDB\n');

  try {
    // Find all vendor users
    const vendorUsers = await User.find({ role: 'vendor' });
    console.log(`📋 Found ${vendorUsers.length} vendor users\n`);

    let fixed = 0;
    let skipped = 0;

    for (const user of vendorUsers) {
      console.log(`👤 Processing user: ${user.name} (${user._id})`);
      
      // Check if vendorId is already set
      if (user.vendorId) {
        console.log(`  ⏭️  Already has vendorId: ${user.vendorId}`);
        skipped++;
        continue;
      }

      // Find vendor document for this user
      const vendor = await Vendor.findOne({ userId: user._id });
      
      if (!vendor) {
        console.log(`  ⚠️  No vendor document found for user ${user._id}`);
        continue;
      }

      // Link vendor to user
      user.vendorId = vendor._id;
      await user.save();
      
      console.log(`  ✅ Linked to vendor: ${vendor._id} (${vendor.shopName})`);
      fixed++;
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${vendorUsers.length}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

linkVendorUsers();

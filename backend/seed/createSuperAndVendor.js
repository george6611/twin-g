/* Seed: createSuperAndVendor.js
   - Creates one super_admin and one vendor user
   - Prints credentials to console

Usage: node seed/createSuperAndVendor.js
Make sure MONGO_URI is set in environment when running.
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Vendor = require('../models/Vendor');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('Connected to Mongo for seeding');

  try {
    // create super admin user
    const superEmail = 'admin@example.com';
    const superPassword = 'AdminPass!234';

    let superUser = await User.findOne({ email: superEmail });
    if (!superUser) {
      superUser = await User.create({
        name: 'Seed Super',
        phone: '254700000000',
        email: superEmail,
        password: superPassword,
        role: 'superadmin',
        permissions: ['*'],
        isActive: true,
      });
      console.log('Created super_admin user');
    } else {
      console.log('super_admin exists');
    }

    // create vendor user
    const vendorUserEmail = 'vendor.user@example.com';
    const vendorUserPassword = 'VendorPass!234';

    let vendorUser = await User.findOne({ email: vendorUserEmail });
    if (!vendorUser) {
      vendorUser = await User.create({
        name: 'Seed Vendor User',
        phone: '254700000002',
        email: vendorUserEmail,
        password: vendorUserPassword,
        role: 'vendor',
        isActive: true,
      });
      console.log('Created vendor user');
    } else {
      console.log('vendor user exists');
    }
    // create vendor document and link to vendor user
    const vendorData = {
      userId: vendorUser._id,
      shopName: 'Seed Vendor Ltd',
      shopDescription: 'Seeded vendor for testing',
      contact: vendorUser.email,
      address: {
        label: 'Main Shop',
        street: '123 Seed Street',
        city: 'Seedville',
        region: 'Seed Region',
        postalCode: '00000',
        country: 'Kenya',
        description: 'Primary seeded branch',
        latitude: 0,
        longitude: 0,
      },
      location: {
        type: 'Point',
        coordinates: [0, 0],
      },
      isVerified: true,
      isActive: true,
    };

    let vendor = await Vendor.findOne({ userId: vendorUser._id });
    if (!vendor) {
      vendor = await Vendor.create(vendorData);
      console.log('Created vendor:', vendor._id.toString());
    } else {
      console.log('Vendor already exists for user:', vendor._id.toString());
    }

    // Link vendor back to user
    if (vendorUser.vendorId?.toString() !== vendor._id.toString()) {
      vendorUser.vendorId = vendor._id;
      await vendorUser.save();
      console.log('Linked vendorId to user:', vendor._id.toString());
    }

    console.log('\nSeed complete. Credentials:');
    console.log('Super Admin -> email:', superEmail, ' password:', superPassword);
    console.log('Vendor User -> email:', vendorUserEmail, ' password:', vendorUserPassword);

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

main();

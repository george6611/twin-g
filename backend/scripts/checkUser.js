const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Check the BuyMore user
  const user = await User.findById('69a77447a2c3170ba7255c0f');
  
  if (!user) {
    console.log('❌ User not found!');
  } else {
    console.log('👤 User found:');
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   VendorId:', user.vendorId);
    console.log('   VendorId toString:', user.vendorId?.toString());
  }
  
  process.exit(0);
}

checkUser();

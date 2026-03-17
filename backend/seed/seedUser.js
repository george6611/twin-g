const User = require("../models/User");

async function generateUniquePhone() {
  let phone;
  let exists = true;

  while (exists) {
    phone = "07" + Math.floor(10000000 + Math.random() * 90000000); // Random 8 digits
    exists = await User.exists({ phone });
  }

  return phone;
}

module.exports = async function seedUsers(count = 50) {
  // Delete previous vendor users to avoid duplicates
  await User.deleteMany({ role: "vendor" });

  const users = [];

  for (let i = 0; i < count; i++) {
    const phone = await generateUniquePhone();

    users.push({
      name: `Test User ${i + 1}`,
      phone,
      email: `user${Date.now()}-${i}@test.com`, // also make email unique
      role: "vendor",
      isVerified: true,
      password: "password123",
    });
  }

  return await User.insertMany(users);
};

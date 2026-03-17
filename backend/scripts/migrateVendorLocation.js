require("dotenv").config();
const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Vendor.updateMany(
      {
        "address.latitude": { $exists: true },
        "address.longitude": { $exists: true },
      },
      [
        {
          $set: {
            location: {
              type: "Point",
              coordinates: [
                "$address.longitude",
                "$address.latitude",
              ],
            },
          },
        },
      ]
    );

    console.log("✅ Migration complete:", result);
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();

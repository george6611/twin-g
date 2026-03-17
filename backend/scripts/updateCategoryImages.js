// scripts/updateCategoryImages.js
require("dotenv").config();
const mongoose = require("mongoose");
const { updateAllCategoriesImages } = require("../services/categoryImageService");

// ⚡ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ⚡ Run the update
updateAllCategoriesImages()
  .then(() => {
    console.log("✅ Done updating category images");
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("❌ Error updating category images:", err);
    mongoose.disconnect();
  });

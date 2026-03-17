const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "userType",
    required: true,
  },
  userType: {
    type: String,
    enum: ["Customer", "Vendor"],
    required: true,
  },
  label: String, 
  addressLine: { type: String, required: true },
  city: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
  isDefault: { type: Boolean, default: false },
});

module.exports = mongoose.model("Address", addressSchema);

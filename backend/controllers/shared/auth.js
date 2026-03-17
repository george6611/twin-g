// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Models
const Customer = require("../../models/Customer");
const Vendor = require("../../models/Vendor");
const Rider = require("../../models/Rider");

// Temporary OTP store for dev/test
const otpStore = {};

// ---------------------- TOKEN GENERATOR ----------------------
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ---------------------- REGISTER (All Roles) ----------------------
exports.register = async (req, res) => {
  const { role, username, password, fullName, phone, email, shopName, address, vehicleType } = req.body;

  try {
    if (!role) return res.status(400).json({ message: "Role is required" });

    let user;
    switch (role) {
      case "customer":
        const existingCustomer = await Customer.findOne({ $or: [{ phone }, { email }, { username }] });
        if (existingCustomer) return res.status(400).json({ message: "Customer already exists" });

        user = await Customer.create({ username, fullName, phone, email, password });
        break;

      case "vendor":
        const existingVendor = await Vendor.findOne({ $or: [{ username }, { contact: phone }] });
        if (existingVendor) return res.status(400).json({ message: "Vendor already exists" });

        user = await Vendor.create({ username, password, shopName, address, contact: phone });
        break;

      case "rider":
        const existingRider = await Rider.findOne({ $or: [{ username }, { phone }] });
        if (existingRider) return res.status(400).json({ message: "Rider already exists" });

        user = await Rider.create({ username, password, fullName, phone, vehicleType });
        break;

      default:
        return res.status(400).json({ message: "Invalid role type" });
    }

    const token = generateToken(user._id, role);
    res.status(201).json({ user, role, token });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- LOGIN ----------------------
exports.login = async (req, res) => {
  const { role, username, password } = req.body;

  try {
    if (!role) return res.status(400).json({ message: "Role is required" });

    let user;
    switch (role) {
      case "vendor":
        user = await Vendor.findOne({ username });
        break;
      case "rider":
        user = await Rider.findOne({ username });
        break;
      default:
        return res.status(400).json({ message: "Login not supported for this role" });
    }

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id, role);
    res.json({ user, role, token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- CUSTOMER OTP FLOW ----------------------
exports.requestOtp = async (req, res) => {
  const { phone } = req.body;

  try {
    const customer = await Customer.findOne({ phone });
    if (!customer) return res.status(400).json({ message: "Phone not registered" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[phone] = otp;

    console.log(`OTP for ${phone}: ${otp}`); // TODO: integrate SMS service
    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error("OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const customer = await Customer.findOne({ phone });
    if (!customer) return res.status(400).json({ message: "Phone not registered" });

    if (otpStore[phone] != otp) return res.status(400).json({ message: "Invalid OTP" });

    delete otpStore[phone];

    const token = generateToken(customer._id, "customer");
    res.json({ user: customer, role: "customer", token });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

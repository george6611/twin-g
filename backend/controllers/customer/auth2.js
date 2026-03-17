// controllers/customerController.js
const User = require("../../models/User");
const Customer = require("../../models/Customer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ---------------------- Helper: JWT Token ----------------------
const generateToken = (id, role = "customer") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Temporary in-memory OTP store (for development/testing)
const otpStore = {};

// ---------------------- REGISTER ----------------------
const registerCustomer = async (req, res) => {
  let { username, password, fullName, phone, email } = req.body;

  try {
    // 1️⃣ Check for existing user
    const existingUser = await User.findOne({
      $or: [{ username }, { phone }, { email }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username, email, or phone already exists" });
    }

    // 2️⃣ Hash password (optional if OTP-only)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // 3️⃣ Create User document
    const user = await User.create({
      username,
      password,
      name:fullName,
      phone,
      email,
      role: "customer",
    });

    // 4️⃣ Create Customer profile (linked by userId)
    const customer = await Customer.create({
      userId: user._id,
      phone,
      email,
    });

    // 5️⃣ Generate JWT
    const token = generateToken(user._id, "customer");

    res.status(201).json({
      customer: {
        id: customer._id,
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- REQUEST OTP ----------------------
const requestOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone, role: "customer" });
    if (!user) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[phone] = otp;

    console.log(`📱 OTP for ${phone}: ${otp}`); // TODO: Replace with SMS API

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP Request Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- VERIFY OTP ----------------------
const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const user = await User.findOne({ phone, role: "customer" });
    if (!user) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    // Check OTP match
    if (otpStore[phone] != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Clear OTP after use
    delete otpStore[phone];

    // Generate JWT
    const token = generateToken(user._id, "customer");

    // Get customer profile
    const customer = await Customer.findOne({ userId: user._id });

    res.json({
      customer: {
        id: customer._id,
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("OTP Verification Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------- EXPORTS ----------------------
module.exports = {
  registerCustomer,
  requestOtp,
  verifyOtp,
};

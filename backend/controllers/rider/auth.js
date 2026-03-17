// controllers/riderController.js
const User = require("../../models/User");
const Rider = require("../../models/Rider");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id, role: "rider" }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// 🧩 Register Rider (Step 1: Basic Info)
const registerRider = async (req, res) => {
  let { username, password, fullName, phone, vehicleType } = req.body;

  try {
    // Normalize vehicleType
    vehicleType = vehicleType ? vehicleType.toLowerCase() : "bike";

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or phone already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create base user
    const newUser = await User.create({
      username,
      password,
      name: fullName,
      phone,
      role: "rider",
    });

    // Create rider profile with minimal info
    const rider = await Rider.create({
      userId: newUser._id,
      vehicleType,
       phoneNumber: phone,
      registrationStatus: "basic_info_submitted",
      completedSteps: ["basic_info"],
    });

    // Generate token
    const token = generateToken(newUser._id);

    res.status(201).json({
      message: "Rider registered successfully",
      rider: {
        id: rider._id,
        username: newUser.username,
        fullName: newUser.name,
        phone: newUser.phone,
        vehicleType: rider.vehicleType,
        registrationStatus: rider.registrationStatus,
      },
      token,
    });
  } catch (err) {
    console.error("Error during rider registration:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧩 Login Rider
const loginRider = async (req, res) => {
  const { identifier, username, password } = req.body; // identifier = phone/email OR username
  const loginValue = identifier || username; // Support both field names
  
  console.log("Rider login attempt:", { loginValue });
  
  try {
    // Find user by username, phone, or email
    const user = await User.findOne({
      $or: [
        { username: loginValue },
        { phone: loginValue },
        { email: loginValue }
      ],
      role: "rider"
    }).select("+password");

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Fetch rider profile
    const rider = await Rider.findOne({ userId: user._id });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    // Generate JWT
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      rider: {
        id: rider._id,
        fullName: user.name,
        phone: user.phone,
        email: user.email,
        vehicleType: rider.vehicleType,
        registrationStatus: rider.registrationStatus,
      },
      token,
    });
  } catch (err) {
    console.error("Error during rider login:", err);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { registerRider, loginRider };

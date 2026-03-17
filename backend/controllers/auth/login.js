const User = require("../../models/User");
const Customer = require("../../models/Customer");
const Vendor = require("../../models/Vendor");
const Rider = require("../../models/Rider");
const jwt = require("jsonwebtoken");

const generateToken = (id, role) =>
  jwt.sign({ userId: id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const login = async (req, res) => {
  try {
    let { identifier, password } = req.body;
    identifier = identifier?.trim();
    password = password?.trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Phone/email and password are required" });
    }

    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    }).select("+password");

    if (!user) return res.status(400).json({ message: "Account not found" });
    if (!user.isActive) return res.status(403).json({ message: "Account is disabled" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Track login
    user.lastLogin = new Date();
    user.lastSeen = new Date();
    await user.save();

    // Load role-specific profile
    let profile = null;
    switch (user.role) {
      case "customer":
        profile = await Customer.findOne({ userId: user._id });
        break;
      case "vendor":
        profile = await Vendor.findOne({ userId: user._id });
        break;
      case "rider":
        profile = await Rider.findOne({ userId: user._id });
        break;
    }

    // Create JWT
    const token = generateToken(user._id, user.role);

    // 🔑 Set HTTP-only cookie
    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send user info + token (for frontend cookie setting)
    res.json({
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        profileImage: user.profileImage,
      },
      profile,
    });

    console.log(`User ${user._id} logged in successfully`);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { login };
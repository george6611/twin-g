const Vendor = require("../../models/Vendor");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ---------------------- Helper: JWT Token ----------------------
const generateToken = (id, role = "vendor") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ---------------------- REGISTER VENDOR ----------------------
const registerVendor = async (req, res) => {
  try {
    console.log("🟢 [REGISTER VENDOR] Request received");
    console.log("📦 Request body:", req.body);

    const {
      username,
      password,
      shopName,
      shopDescription,
      contact,
      email,
      addresses,
    } = req.body;

    if (!username || !password || !shopName || !contact || !email) {
      console.log("❌ [REGISTER VENDOR] Missing required fields");
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!Array.isArray(addresses) || addresses.length === 0) {
      console.log("❌ [REGISTER VENDOR] Invalid addresses");
      return res.status(400).json({ message: "At least one address is required." });
    }

    console.log("✅ [REGISTER VENDOR] Validation passed");

    const existingUser = await User.findOne({
      $or: [{ username }, { phone: contact }, { email }],
    });
    if (existingUser) {
      console.log("❌ [REGISTER VENDOR] User already exists");
      return res.status(400).json({ message: "Username, email, or contact already exists." });
    }

    console.log("✅ [REGISTER VENDOR] User doesn't exist, creating...");

    const user = await User.create({
      username,
      password,
      name: shopName,
      phone: contact,
      email,
      role: "vendor",
    });

    console.log("✅ [REGISTER VENDOR] User created:", { userId: user._id, email: user.email });

    const primaryAddress = addresses.find(a => a.isPrimary) || addresses[0];

    // Default coordinates to Nairobi if not provided
    const defaultLat = -1.2865; // Nairobi latitude
    const defaultLng = 36.8172;  // Nairobi longitude

    const vendor = await Vendor.create({
      userId: user._id,
      shopName,
      shopDescription,
      contact,
      email,
      address: {
        label: primaryAddress.label || "Main Shop",
        street: primaryAddress.street || "",
        city: primaryAddress.city || "",
        region: primaryAddress.region || "",
        postalCode: primaryAddress.postalCode || "",
        country: primaryAddress.country || "Kenya",
        description: primaryAddress.description || "",
        latitude: primaryAddress.latitude || defaultLat,
        longitude: primaryAddress.longitude || defaultLng,
      },
      location: {
        type: "Point",
        coordinates: [primaryAddress.longitude || defaultLng, primaryAddress.latitude || defaultLat],
      },
    });

    // Link user back to vendor for unified auth flows
    user.vendorId = vendor._id;
    await user.save();

    console.log("✅ [REGISTER VENDOR] Vendor created:", { vendorId: vendor._id });

    const token = generateToken(user._id, "vendor");

    console.log("✅ [REGISTER VENDOR] Token generated, sending response");

    res.status(201).json({
      vendor,
      token,
    });
  } catch (err) {
    console.error("❌ [REGISTER VENDOR] Error:", err);
    console.error("❌ Stack:", err.stack);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ---------------------- LOGIN VENDOR ----------------------
// ---------------------- LOGIN VENDOR ----------------------
const loginVendor = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("🟢 Login request:", { email });

    // ✅ Find user by email only (since there's no username field)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log("❌ No user found with that email");
      return res.status(400).json({ message: "Invalid credentials - user not found" });
    }

    console.log("✅ Found user:", { id: user._id, email: user.email, role: user.role });

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🧩 Password match:", isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials - wrong password" });
    }

    // ✅ Find linked vendor profile
    const vendor = await Vendor.findOne({ userId: user._id });
    if (!vendor) {
      console.log("⚠️ Vendor profile not found for user:", user._id);
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // ✅ Generate JWT
    const token = generateToken(user._id, "vendor");

    // ✅ Return vendor data
    res.json({
      vendor: {
        id: vendor._id,
        userId: vendor.userId,
        shopName: vendor.shopName,
        shopDescription: vendor.shopDescription,
        address: vendor.address,
        contact: vendor.contact,
        email: vendor.email,
        createdAt: vendor.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("Vendor Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};




module.exports = { registerVendor, loginVendor };

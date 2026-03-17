const User = require("../../models/User");
const Customer = require("../../models/Customer");
const jwt = require("jsonwebtoken");

// ---------------------- Helper: JWT Token ----------------------
const generateToken = (id, role = "customer") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ---------------------- REGISTER ----------------------
const registerCustomer = async (req, res) => {
  try {
    let { username, password, fullName, phone, email, addresses } = req.body;

    // Trim strings
    username = username?.trim();
    fullName = fullName?.trim();
    phone = phone?.trim();
    email = email?.trim();

    // Basic validation
    if (!fullName || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Full name, phone, and password are required" });
    }

    // Check for existing user by username, phone, or email
    const existingUser = await User.findOne({
      $or: [
        username ? { username } : null,
        { phone },
        email ? { email } : null,
      ].filter(Boolean),
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username, email, or phone already exists" });
    }

    // Validate addresses
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res
        .status(400)
        .json({ message: "Primary address is required" });
    }

    const primaryCount = addresses.filter((a) => a.isPrimary === true).length;
    if (primaryCount !== 1) {
      return res
        .status(400)
        .json({ message: "Exactly one primary address required" });
    }

    // Map frontend address fields to schema fields
    const mappedAddresses = addresses.map((addr) => ({
      label: addr.label || "",
      street: addr.street || "",
      city: addr.city || "",
      region: addr.region || "",
      country: addr.country || "Kenya",
      postalCode: addr.postalCode || "",
      latitude: addr.latitude ?? null,
      longitude: addr.longitude ?? null,
      description: addr.description || "",
      isPrimary: addr.isPrimary || true,
    }));

    // Create User
    const user = await User.create({
      username,
      password,
      name: fullName,
      phone,
      email,
      role: "customer",
    });

    // Create Customer profile
    const customer = await Customer.create({
      userId: user._id,
      phone,
      email,
      name: fullName,
      addresses: mappedAddresses,
    });

    // Generate JWT
    const token = generateToken(user._id, "customer");

    // Respond with customer info and token
    res.status(201).json({
      customer: {
        id: customer._id,
        userId: user._id,
        username: user.username,
        fullName: user.name,
        phone: user.phone,
        email: user.email,
        addresses: customer.addresses,
        createdAt: customer.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerCustomer,
};


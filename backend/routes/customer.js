import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Customer from "../../models/Customer.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password, name, phone, address, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await Customer.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({ username, password: hashedPassword, name, phone, address, email });
    await customer.save();

    res.status(201).json({ message: "Customer registered successfully", customerId: customer._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing username or password" });

    const customer = await Customer.findOne({ username });
    if (!customer) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, customer.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    // Optionally generate JWT
    const token = jwt.sign({ id: customer._id, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token, customerId: customer._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

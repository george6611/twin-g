import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Rider from "../../models/Rider.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password, name, phone, vehicle, licenseNumber } = req.body;
    if (!username || !password || !name) return res.status(400).json({ message: "Missing required fields" });

    const existing = await Rider.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const rider = new Rider({ username, password: hashedPassword, name, phone, vehicle, licenseNumber });
    await rider.save();

    res.status(201).json({ message: "Rider registered successfully", riderId: rider._id });
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

    const rider = await Rider.findOne({ username });
    if (!rider) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, rider.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: rider._id, role: "rider" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful", token, riderId: rider._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

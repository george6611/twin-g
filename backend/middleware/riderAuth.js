const jwt = require("jsonwebtoken");
const Rider = require("../models/Rider");

const protectRider = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const rider = await Rider.findOne({ userId: decoded.id }).select("-password");
    if (!rider) {
      return res.status(401).json({ message: "Not authorized, rider not found" });
    }

    req.rider = rider;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protectRider };

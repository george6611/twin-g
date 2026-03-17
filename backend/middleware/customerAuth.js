// middleware/customerAuth.js
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

const protectCustomer = async (req, res, next) => {
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

    // Look for customer by userId (not _id)
    const customer = await Customer.findOne({ userId: decoded.id }).select("-password");
    if (!customer) {
      return res.status(401).json({ message: "Not authorized, customer not found" });
    }

    req.customer = customer;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protectCustomer };

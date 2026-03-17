const jwt = require("jsonwebtoken");
const Vendor = require("../models/Vendor");

const protectVendor = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const vendor = await Vendor.findOne({ userId: decoded.id }).select("-password");
    if (!vendor) return res.status(401).json({ message: "Not authorized, vendor not found" });

    req.vendor = vendor;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protectVendor };

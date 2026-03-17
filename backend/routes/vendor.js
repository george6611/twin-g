// routes/vendorPublic.js
const express = require("express");
const router = express.Router();
const profile = require("../controllers/vendor/profile");

// ---------------------- GET VENDOR BY ID ----------------------
router.get("/:vendorId", profile.getVendorById);

module.exports = router;

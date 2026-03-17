// routes/auth.js
const express = require("express");
const router = express.Router();
const { register, login, requestOtp, verifyOtp } = require("../../controllers/shared/auth");

router.post("/register", register);
router.post("/login", login);

// OTP routes for customers
router.post("/customer/request-otp", requestOtp);
router.post("/customer/verify-otp", verifyOtp);

module.exports = router;

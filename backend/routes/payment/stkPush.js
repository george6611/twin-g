// routes/stkRoutes.js
const express = require("express");
const router = express.Router();
const { initiateStkPush, handleStkCallback } = require("../../controllers/payment/stkPush")
const { protect, authorizeRoles } = require("../../middleware/auth");
// Route to initiate STK Push
router.post("/initiate", protect, authorizeRoles("customer"),initiateStkPush);

// Callback route (called by Safaricom)
router.post("/callback",handleStkCallback);

module.exports = router;

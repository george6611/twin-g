const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const {
  initiatePayment,
  getPaymentHistory,
  mpesaCallback,
} = require("../../controllers/customer/payment");

// 💰 Initiate payment (e.g. M-Pesa STK Push)
router.post("/initiate", protect, authorizeRoles("customer"), initiatePayment);

// 📜 Get my payment history
router.get("/", protect, authorizeRoles("customer"), getPaymentHistory);

// 📞 Receive M-Pesa callback (no auth)
router.post("/mpesa/callback", mpesaCallback);

module.exports = router;

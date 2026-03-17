// routes/auth/customer.js
const express = require("express");
const { registerCustomer } = require("../../controllers/customer/auth");

const router = express.Router();

router.post("/register", registerCustomer);

module.exports = router;
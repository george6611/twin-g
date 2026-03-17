// routes/auth/rider.js
const express = require("express");
const { registerRider, loginRider } = require("../../controllers/rider/auth");
const { protectRider } = require("../../middleware/riderAuth");

const router = express.Router();

router.post("/register", registerRider);
router.post("/login", loginRider);

module.exports = router;

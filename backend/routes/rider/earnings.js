const express = require("express");
const router = express.Router();

// 🧱 Middleware
const { protect, authorizeRoles } = require("../../middleware/auth");

// 🧩 Controller
const { getEarnings } = require("../../controllers/rider/earnings");


router.get(
  "/",
  protect, authorizeRoles("rider"),
  getEarnings                  
);

module.exports = router;

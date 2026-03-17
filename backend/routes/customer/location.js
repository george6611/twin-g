const express = require("express");
const router = express.Router();
const { updateCustomerLocation } = require("../../controllers/customer/location");
const {protect, authorizeRoles} = require("../../middleware/auth")

router.post("/update-location",  protect, authorizeRoles("customer"), updateCustomerLocation);

module.exports = router;

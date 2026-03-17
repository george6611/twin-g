const express = require("express");
const router = express.Router();

const { getProfile, updateProfile } = require("../../controllers/customer/profile");
const upload = require("../../middleware/fileUpload");
const { protect } = require("../../middleware/auth"); // import auth middleware

// 👤 Get current profile (all roles supported)
router.get("/", protect, getProfile);

// ✏️ Update profile (with optional image)
router.put("/", protect, upload.single("profileImage"), updateProfile);

module.exports = router;

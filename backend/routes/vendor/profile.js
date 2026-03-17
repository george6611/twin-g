const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const upload = require("../../middleware/fileUpload");
const profile = require("../../controllers/vendor/profile");

// 📍 Vendor profile
router.get("/", protect, authorizeRoles("vendor"), profile.getProfile);

// ✏️ Update vendor profile (with optional shop logo)
router.put(
  "/",
  protect,
  authorizeRoles("vendor"),
  upload.single("shopLogo"),
  profile.updateProfile
);

// 📄 Upload multiple vendor documents
router.post(
  "/documents",
  protect,
  authorizeRoles("vendor"),
  upload.array("documents", 5), // limit to 5 files per request
  profile.uploadDocuments
);

module.exports = router;

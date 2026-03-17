const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const upload = require("../../middleware/fileUpload"); // multer

const {
  getProfile,
  updateProfile,
  updateVehicleInfo,
  updateDocuments,
} = require("../../controllers/rider/profile");

// GET rider profile
router.get("/", protect, authorizeRoles("rider"), getProfile);

// UPDATE vehicle info (with optional vehicleImage upload)
router.put(
  "/vehicle",
  protect,
  authorizeRoles("rider"),
  upload.single("vehicleImage"),
  async (req, res) => {
    // attach uploaded file to body if exists
    if (req.file) req.body.vehicleImage = req.file.path || req.file.filename;
    await updateVehicleInfo(req, res);
  }
);

// UPDATE documents
router.put("/documents", protect, authorizeRoles("rider"), updateDocuments);

// UPDATE personal/profile info (with optional profileImage upload)
router.put(
  "/personal",
  protect,
  authorizeRoles("rider"),
  upload.single("profileImage"),
  async (req, res) => {
    if (req.file) req.body.profileImage = req.file.path || req.file.filename;
    await updateProfile(req, res);
  }
);

module.exports = router;

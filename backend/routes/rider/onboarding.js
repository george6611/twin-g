const express = require("express");
const { protect, authorizeRoles } = require("../../middleware/auth");
const upload = require("../../middleware/riderDocumentsUpload");
const {
  submitRiderApplication,
  uploadOnboardingDocuments,
} = require("../../controllers/rider/onboarding");

const router = express.Router();

router.post("/apply", submitRiderApplication);

router.put(
  "/documents",
  protect,
  authorizeRoles("rider"),
  upload.fields([
    { name: "drivingLicense", maxCount: 1 },
    { name: "validInsurance", maxCount: 1 },
    { name: "saccoProof", maxCount: 1 },
  ]),
  uploadOnboardingDocuments
);

module.exports = router;

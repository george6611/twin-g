const express = require("express");
const { protectAdmin } = require("../../middleware/adminAuth");
const upload = require("../../middleware/riderDocumentsUpload");
const {
  validateRiderOnboarding,
  validateRiderDetailsUpdate,
  validateSaccoAssignment,
  validateStatusUpdate,
  validateRiderId,
} = require("../../middleware/validateRiderInput");
const {
  validateSaccoRegistration,
  validateSaccoId,
} = require("../../middleware/validateSaccoInput");
const {
  registerSacco,
  listSaccos,
  createRiderByAdmin,
  listRiderApplications,
  getRiderApplicationById,
  assignRiderSacco,
  updateRiderApplicationStatus,
  updateRiderDetails,
  verifyRiderDocuments,
  uploadRiderDocuments,
} = require("../../controllers/admin/riderOnboarding");

const router = express.Router();

router.use(protectAdmin);

router.get("/saccos", listSaccos);
router.post("/saccos", validateSaccoRegistration, registerSacco);

router.get("/riders", listRiderApplications);
router.get("/riders/:riderId", validateRiderId, getRiderApplicationById);
router.post("/riders", validateRiderOnboarding, createRiderByAdmin);
router.patch("/riders/:riderId/assign-sacco", validateSaccoAssignment, assignRiderSacco);
router.patch("/riders/:riderId/status", validateStatusUpdate, updateRiderApplicationStatus);
router.patch("/riders/:riderId/details", validateRiderDetailsUpdate, updateRiderDetails);
router.post("/riders/:riderId/verify-documents", validateRiderId, verifyRiderDocuments);
router.post(
  "/riders/:riderId/upload-documents",
  validateRiderId,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "validInsurance", maxCount: 1 },
    { name: "saccoProof", maxCount: 1 },
  ]),
  uploadRiderDocuments
);

module.exports = router;

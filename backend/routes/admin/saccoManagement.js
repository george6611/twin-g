const express = require("express");
const { protectAdmin } = require("../../middleware/adminAuth");
const { uploadRegistrationDoc, uploadAdditionalDocs } = require("../../middleware/saccoDocumentsUpload");
const {
  validateSaccoRegistration,
  validateAddMember,
  validateSaccoStatusUpdate,
  validateSaccoId,
} = require("../../middleware/validateSaccoInput");
const {
  listSaccos,
  getSaccoById,
  registerSacco,
  updateSaccoDetails,
  uploadSaccoDocuments,
  updateSaccoStatus,
  addSaccoMember,
  deleteSaccoMember,
} = require("../../controllers/admin/saccoManagement");

const router = express.Router();

router.use(protectAdmin);

// Sacco CRUD
router.get("/", listSaccos);
router.get("/:saccoId", validateSaccoId, getSaccoById);
router.post("/", validateSaccoRegistration, registerSacco);
router.patch("/:saccoId", validateSaccoId, updateSaccoDetails);

// Document uploads
router.post("/:saccoId/upload-registration", validateSaccoId, uploadRegistrationDoc, uploadSaccoDocuments);
router.post("/:saccoId/upload-additional", validateSaccoId, uploadAdditionalDocs, uploadSaccoDocuments);

// Status management
router.patch("/:saccoId/status", validateSaccoStatusUpdate, updateSaccoStatus);

// Member management
router.post("/:saccoId/members", validateAddMember, addSaccoMember);
router.delete("/:saccoId/members/:memberIndex", validateSaccoId, deleteSaccoMember);

module.exports = router;

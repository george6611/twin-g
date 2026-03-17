const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth");
const { updateRiderStatus, getRiderStatus } = require("../../controllers/rider/status");

/**
 * @route   PUT /api/rider/status
 * @desc    Update rider online/offline status
 * @access  Private (rider)
 */
router.get("/", protect, authorizeRoles("rider"), getRiderStatus);
router.put("/", protect, authorizeRoles("rider"), updateRiderStatus);



module.exports = router;

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/shared/address");

router.post("/", controller.addAddress);
router.get("/", controller.getAddresses);

module.exports = router;

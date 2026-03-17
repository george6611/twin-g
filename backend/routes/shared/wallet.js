const express = require("express");
const router = express.Router();
const controller = require("../../controllers/shared/wallet");

router.get("/", controller.getWallet);
router.post("/update", controller.updateWallet);

module.exports = router;

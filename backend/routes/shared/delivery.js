const express = require("express");
const router = express.Router();
const controller = require("../../controllers/shared/delivery");

router.post("/", controller.createDelivery);
router.put("/:id/status", controller.updateStatus);
router.get("/", controller.getDeliveries);

module.exports = router;

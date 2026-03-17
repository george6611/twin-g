const express = require("express");
const router = express.Router();
const controller = require("../../controllers/shared/message");

router.post("/", controller.sendMessage);
router.get("/", controller.getConversation);

module.exports = router;

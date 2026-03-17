const express = require("express");
const router = express.Router();
const controller = require("../../controllers/shared/session");

router.post("/", controller.createSession);
router.get("/verify", controller.verifySession);

module.exports = router;

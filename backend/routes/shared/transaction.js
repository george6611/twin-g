const express = require("express");
const router = express.Router();
const controller = require("../../controllers/shared/transaction");

router.post("/", controller.recordTransaction);
router.get("/", controller.getTransactions);

module.exports = router;

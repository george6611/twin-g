// routes/authRoutes.js
const express = require("express");
const { login } = require("../../controllers/auth/login");

const router = express.Router();

router.post("/", login);

module.exports = router;

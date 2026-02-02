// backend/routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const report = require("../controllers/ReportController");

router.get("/report", auth, report.getRawReport);

module.exports = router;

const express = require("express");
const router = express.Router();
const authRouter = require("./auth.routes");
const studentRouter = require("./student.routes");
const companyRouter = require("./company.routes");
const listingRouter = require("./listing.routes");
const applicationRouter = require("./application.routes");
const notificationRouter = require("./notification.routes");
const auditRouter = require("./audit.routes");
const { successResponse } = require("../utils/envelope");

router.get("/health", (req, res) => {
  res.status(200).json(successResponse({ status: "UP" }));
});

router.use("/auth", authRouter);
router.use("/students", studentRouter);
router.use("/companies", companyRouter);
router.use("/listings", listingRouter);
router.use("/applications", applicationRouter);
router.use("/notifications", notificationRouter);
router.use("/audit", auditRouter);

module.exports = router;

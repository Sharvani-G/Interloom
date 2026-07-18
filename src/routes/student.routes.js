const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const { authenticateToken, requireRole } = require("../middlewares/auth.middleware");
const { validateRequest } = require("../middlewares/validation.middleware");
const { updateStudentSchema } = require("../utils/validation");

router.use(authenticateToken);
router.use(requireRole(["STUDENT"]));

router.get("/me", studentController.getProfile);

router.put(
  "/me",
  validateRequest({ body: updateStudentSchema }),
  studentController.updateProfile
);

router.delete("/me", studentController.deleteProfile);

router.get("/me/applications", studentController.getApplications);

module.exports = router;

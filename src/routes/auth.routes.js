const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { validateRequest } = require("../middlewares/validation.middleware");
const {
  registerStudentSchema,
  registerCompanySchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  refreshSchema
} = require("../utils/validation");

router.post(
  "/register/student",
  validateRequest({ body: registerStudentSchema }),
  authController.registerStudent
);

router.post(
  "/register/company",
  validateRequest({ body: registerCompanySchema }),
  authController.registerCompany
);

router.post(
  "/verify-otp",
  validateRequest({ body: verifyOtpSchema }),
  authController.verifyOtp
);

router.post(
  "/resend-otp",
  validateRequest({ body: resendOtpSchema }),
  authController.resendOtp
);

router.post(
  "/login",
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post(
  "/refresh",
  validateRequest({ body: refreshSchema }),
  authController.refreshToken
);

router.post(
  "/logout",
  validateRequest({ body: refreshSchema }),
  authController.logout
);

module.exports = router;

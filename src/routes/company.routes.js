const express = require("express");
const router = express.Router();
const companyController = require("../controllers/company.controller");
const { authenticateToken, requireRole } = require("../middlewares/auth.middleware");
const { validateRequest } = require("../middlewares/validation.middleware");
const { updateCompanySchema } = require("../utils/validation");

router.use(authenticateToken);
router.use(requireRole(["COMPANY"]));

router.get("/me", companyController.getProfile);
router.put(
  "/me",
  validateRequest({ body: updateCompanySchema }),
  companyController.updateProfile
);
router.get("/me/listings", companyController.getListings);

module.exports = router;

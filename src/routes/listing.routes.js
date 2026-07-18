const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listing.controller");
const applicationController = require("../controllers/application.controller");
const { authenticateToken, requireRole } = require("../middlewares/auth.middleware");
const { validateRequest } = require("../middlewares/validation.middleware");
const {
  createListingSchema,
  updateListingSchema,
  updateListingStatusSchema
} = require("../utils/validation");

// Protected by JWT auth
router.use(authenticateToken);

// Company listing creation and management
router.post(
  "/",
  requireRole(["COMPANY"]),
  validateRequest({ body: createListingSchema }),
  listingController.createListing
);

router.put(
  "/:id",
  requireRole(["COMPANY"]),
  validateRequest({ body: updateListingSchema }),
  listingController.updateListing
);

router.patch(
  "/:id/status",
  requireRole(["COMPANY"]),
  validateRequest({ body: updateListingStatusSchema }),
  listingController.updateListingStatus
);

// Student/Company list and detail routes
router.get("/", requireRole(["STUDENT"]), listingController.getListings);
router.get("/:id", listingController.getListingById);

// Application endpoints attached to listings
router.post(
  "/:id/apply",
  requireRole(["STUDENT"]),
  applicationController.apply
);

router.get(
  "/:id/applicants",
  requireRole(["COMPANY"]),
  applicationController.getApplicants
);

module.exports = router;

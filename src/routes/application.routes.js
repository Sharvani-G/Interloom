const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const { authenticateToken, requireRole } = require("../middlewares/auth.middleware");
const { validateRequest } = require("../middlewares/validation.middleware");
const {
  updateApplicationStatusSchema,
  bulkUpdateApplicationsSchema
} = require("../utils/validation");

// Protected by JWT auth
router.use(authenticateToken);

// Bulk status update MUST be registered before dynamic /:id parameter routes
router.patch(
  "/bulk-update",
  requireRole(["COMPANY"]),
  validateRequest({ body: bulkUpdateApplicationsSchema }),
  applicationController.bulkUpdateStatus
);

router.patch(
  "/:id/status",
  requireRole(["COMPANY"]),
  validateRequest({ body: updateApplicationStatusSchema }),
  applicationController.updateStatus
);

router.patch(
  "/:id/withdraw",
  requireRole(["STUDENT"]),
  applicationController.withdraw
);

module.exports = router;

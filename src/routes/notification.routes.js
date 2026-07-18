const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// Protected by JWT auth
router.use(authenticateToken);

// Bulk read MUST be registered before dynamic /:id parameter routes
router.patch("/bulk-read", notificationController.markAllAsRead);
router.get("/", notificationController.getNotifications);
router.patch("/:id/read", notificationController.markAsRead);

module.exports = router;

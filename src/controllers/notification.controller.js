const notificationService = require("../services/notification.service");
const { successResponse } = require("../utils/envelope");

async function getNotifications(req, res, next) {
  try {
    const isRead = req.query.isRead;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { notifications, pagination } = await notificationService.getNotifications(
      req.user.id,
      isRead,
      page,
      limit
    );

    res.status(200).json(successResponse(notifications, pagination));
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await notificationService.markAsRead(req.user.id, req.params.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};

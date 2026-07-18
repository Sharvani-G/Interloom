const prisma = require("../utils/db");

async function createNotification(userId, type, message) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        isRead: false
      }
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
    // Don't fail the request if notification fails to write
  }
}

async function getNotifications(userId, isReadFilter, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const where = { userId };
  if (isReadFilter !== undefined) {
    where.isRead = isReadFilter === "true" || isReadFilter === true;
  }

  const total = await prisma.notification.count({ where });

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit
  });

  return {
    notifications,
    pagination: {
      page,
      limit,
      total
    }
  };
}

async function markAsRead(userId, id) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId }
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
}

async function markAllAsRead(userId) {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead
};

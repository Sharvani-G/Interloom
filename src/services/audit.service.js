const prisma = require("../utils/db");

async function logEvent({ actorId, actorType, action, resourceType, resourceId, beforeState = null, afterState = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        actorType,
        action,
        resourceType,
        resourceId,
        beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
        afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null
      }
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

async function getAuditLogs(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const total = await prisma.auditLog.count();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take: limit
  });

  return {
    logs,
    pagination: {
      page,
      limit,
      total
    }
  };
}

module.exports = {
  logEvent,
  getAuditLogs
};

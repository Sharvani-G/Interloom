/**
 * Standard API response envelope formatter.
 */
function successResponse(data, pagination = null) {
  const meta = {
    timestamp: new Date().toISOString()
  };
  
  if (pagination) {
    meta.pagination = {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || 0
    };
  }

  return {
    success: true,
    data: data || {},
    error: null,
    meta
  };
}

function errorResponse(code, message, details = {}) {
  return {
    success: false,
    data: null,
    error: {
      code: code || "INTERNAL_SERVER_ERROR",
      message: message || "An unexpected error occurred",
      details: details || {}
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

module.exports = {
  successResponse,
  errorResponse
};

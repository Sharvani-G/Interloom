class AppError extends Error {
  constructor(message, statusCode, code, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", details = {}) {
    super(message, 400, "VALIDATION_FAILED", details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden access", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found", code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict occurred", code = "CONFLICT") {
    super(message, 409, code);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details = {}) {
    super(message, 400, code, details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError
};

const { errorResponse } = require("../utils/envelope");
const { AppError } = require("../utils/errors");
const { ZodError } = require("zod");

function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const details = {};
    err.issues.forEach((issue) => {
      const field = issue.path.join(".");
      details[field] = issue.message;
    });
    return res.status(400).json(
      errorResponse(
        "VALIDATION_FAILED",
        "Input validation failed",
        details
      )
    );
  }

  // Handle custom AppErrors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      errorResponse(
        err.code,
        err.message,
        err.details
      )
    );
  }

  // Prisma errors can also be checked here if needed
  if (err.code && err.code.startsWith("P")) {
    // Prisma database error
    console.error("Database Error:", err);
    return res.status(400).json(
      errorResponse(
        "DATABASE_ERROR",
        "A database operation failed or violated a constraint",
        { code: err.code, meta: err.meta }
      )
    );
  }

  // Catch-all for unexpected internal errors
  console.error("Unhandled Exception:", err);
  
  return res.status(500).json(
    errorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected internal server error occurred"
    )
  );
}

module.exports = errorHandler;

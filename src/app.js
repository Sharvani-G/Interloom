const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const rateLimiter = require("./middlewares/rateLimit.middleware");
const errorHandler = require("./middlewares/error.middleware");
const { errorResponse } = require("./utils/envelope");

const app = express();

app.use(cors());
app.use(express.json());
app.use(rateLimiter(100, 15 * 60 * 1000)); // Allow 100 requests per 15 minutes globally

// Serve Dashboard UI static files
app.use("/", express.static("public"));

// Main router
app.use("/api", routes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json(
    errorResponse("NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`)
  );
});

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;

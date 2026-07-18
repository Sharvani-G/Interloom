require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Optional: Graceful shutdown or logging
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
  // Optional: Graceful shutdown or logging
  process.exit(1);
});

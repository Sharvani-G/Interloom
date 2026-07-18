const ipRequestCounts = new Map();

function customRateLimiter(limit = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();

    if (!ipRequestCounts.has(ip)) {
      ipRequestCounts.set(ip, []);
    }

    const timestamps = ipRequestCounts.get(ip);

    // Filter timestamps outside the sliding window
    const windowStart = now - windowMs;
    const recentTimestamps = timestamps.filter((t) => t > windowStart);
    recentTimestamps.push(now);
    ipRequestCounts.set(ip, recentTimestamps);

    if (recentTimestamps.length > limit) {
      const oldestActiveTimestamp = recentTimestamps[0];
      const retryAfterSeconds = Math.ceil((windowMs - (now - oldestActiveTimestamp)) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);

      return res.status(429).json({
        success: false,
        data: null,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests from this IP. Please try again later.",
          details: {
            limit,
            windowMs
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
}

module.exports = customRateLimiter;

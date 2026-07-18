const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}/api/health`;

async function testRateLimiter() {
  console.log("==========================================");
  console.log("STARTING RATE LIMITER VERIFICATION TEST");
  console.log("==========================================");
  console.log("Sending 101 requests to /api/health...");

  let successCount = 0;
  let blockedCount = 0;
  let retryAfterHeader = null;

  for (let i = 1; i <= 101; i++) {
    try {
      const res = await fetch(URL);
      if (res.status === 200) {
        successCount++;
      } else if (res.status === 429) {
        blockedCount++;
        retryAfterHeader = res.headers.get("retry-after");
        console.log(`Request ${i} blocked! Status: ${res.status}, Retry-After: ${retryAfterHeader}`);
      } else {
        console.log(`Request ${i} returned status: ${res.status}`);
      }
    } catch (err) {
      console.error(`Request ${i} failed:`, err.message);
    }
  }

  console.log("------------------------------------------");
  console.log(`Total Successful Requests (200 OK): ${successCount}`);
  console.log(`Total Blocked Requests (429): ${blockedCount}`);
  console.log(`Retry-After Header Received: ${retryAfterHeader}`);
  console.log("==========================================");

  if (successCount === 100 && blockedCount === 1 && retryAfterHeader !== null) {
    console.log("TEST SUCCESSFUL: Rate limiter blocks request 101 exactly with Retry-After header!");
  } else {
    console.error("TEST FAILED: Incorrect block count or missing header!");
  }
}

testRateLimiter();

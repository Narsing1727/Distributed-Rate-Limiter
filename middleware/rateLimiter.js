const luaLimiter = require("../algorithms/luaLimiter");
const localLimiter = require("../algorithms/localLimiter");
const { getUserLimit } = require("../config/limitService");
const redis = require("../redis/redisClient");
const { totalRequests, blockedRequests, allowedRequests } = require("../metrics/metrics");

async function rateLimiter(req, res, next) {

  const userPlan = req.headers["x-plan"] || "free";
  const limit = await getUserLimit(userPlan);

  const key = `rate:user:${req.ip}`;

  let allowed;

  // Prometheus metric
  totalRequests.inc();

  try {

    allowed = await luaLimiter(key, limit);

   const pipeline = redis.pipeline();

pipeline.incr("metrics:total_requests");
pipeline.zincrby("metrics:user_requests",1,req.ip);

await pipeline.exec();

  } catch (err) {

    console.log("Redis unavailable, using local limiter");

    allowed = localLimiter(key, limit);

  }

  if (!allowed) {

    blockedRequests.inc();

    try {
   const pipeline = redis.pipeline();
pipeline.incr("metrics:blocked_requests");
await pipeline.exec();
    } catch {}

    res.setHeader("Retry-After", 60);

    return res.status(429).json({
      error: "Rate limit exceeded",
      retry_after: 60
    });
  }

  allowedRequests.inc();

  next();
}

module.exports = rateLimiter;
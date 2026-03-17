const luaLimiter = require("../algorithms/luaLimiter");
const localLimiter = require("../algorithms/localLimiter");
const { getUserLimit } = require("../config/limitService");
const { getRedisClient } = require("../redis/redisCluster");
const { totalRequests, blockedRequests, allowedRequests } = require("../metrics/metrics");
const { sendEvent } = require("../kafka/producer");

async function rateLimiter(req, res, next) {

  const userPlan = req.headers["x-plan"] || "free";
  const limit = await getUserLimit(userPlan);

  const userId = req.headers["user-id"] || req.ip;
  const key = `rate:user:${userId}`;

  let allowed;

  totalRequests.inc();

  try {

    // ✅ Lua limiter (uses cluster internally)
    allowed = await luaLimiter(key, limit);

    // ✅ IMPORTANT: get redis client
    const redis = getRedisClient(key);

    const pipeline = redis.pipeline();

    await sendEvent({
      userId,
      status: "allowed",
      timestamp: Date.now()
    });

    pipeline.incr("metrics:total_requests");
    pipeline.zincrby("metrics:user_requests", 1, userId);

    await pipeline.exec();

  } catch (err) {

    console.log("Redis unavailable, using local limiter");

    allowed = localLimiter(key, limit);

  }

  if (!allowed) {

    blockedRequests.inc();

    try {

      const redis = getRedisClient(key); // ✅ FIX
      const pipeline = redis.pipeline();

      await sendEvent({
        userId,
        status: "blocked",
        timestamp: Date.now()
      });

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
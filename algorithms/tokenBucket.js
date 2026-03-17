const redis = require("../redis/redisClient");

const CAPACITY = 10;
const REFILL_RATE = 1;

async function tokenBucket(key) {

  const bucket = await redis.hmget(key, "tokens", "lastRefill");

  let tokens = bucket[0] ? parseFloat(bucket[0]) : CAPACITY;
  let lastRefill = bucket[1] ? parseInt(bucket[1]) : Date.now();

  const now = Date.now();

  const elapsed = (now - lastRefill) / 1000;

  const refill = elapsed * REFILL_RATE;

  tokens = Math.min(CAPACITY, tokens + refill);

  if (tokens < 1) {
    return false;
  }

  tokens -= 1;

  await redis.hmset(key, {
    tokens: tokens,
    lastRefill: now
  });

  await redis.expire(key, 120);

  return true;
}

module.exports = tokenBucket;
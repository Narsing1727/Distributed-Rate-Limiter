const redis = require("../redis/redisClient");

const WINDOW_SIZE = 60; 
const MAX_REQUESTS = 5;

async function slidingWindow(key) {

  const currentTime = Date.now();
  const windowStart = currentTime - WINDOW_SIZE * 1000;

  await redis.zremrangebyscore(key, 0, windowStart);

  const requestCount = await redis.zcard(key);

  if (requestCount >= MAX_REQUESTS) {
    return false;
  }

  await redis.zadd(key, currentTime, currentTime);

  await redis.expire(key, WINDOW_SIZE);

  return true;
}

module.exports = slidingWindow;
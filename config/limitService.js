const redis = require("../redis/redisClient");

async function getUserLimit(plan) {

  try {

    const limit = await redis.hget("rate_limit:config", plan);

    return limit ? parseInt(limit) : 10;

  } catch (err) {

    console.log("Redis config unavailable → using default limit");

    const defaults = {
      free: 10,
      pro: 100,
      enterprise: 1000
    };

    return defaults[plan] || 10;
  }
}

module.exports = { getUserLimit };
const Redis = require("ioredis");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";

const redis = new Redis({
  host: redisHost,
  port: 6379
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.log("Redis error:", err.message);
});

module.exports = redis;
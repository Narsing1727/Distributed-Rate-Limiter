const fs = require("fs");
const path = require("path");
const redis = require("../redis/redisClient");

const script = fs.readFileSync(
  path.join(__dirname, "../lua/tokenBucket.lua"),
  "utf8"
);

async function luaLimiter(key, capacity = 10) {

  const now = Date.now();

  const result = await redis.eval(
    script,
    1,
    key,
    capacity,
    1,
    now
  );

  return result === 1;
}

module.exports = luaLimiter;
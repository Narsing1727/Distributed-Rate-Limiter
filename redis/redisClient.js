const { getRedisClient } = require("./redisCluster");

// 🔥 wrapper to keep old code working
module.exports = {
  getClient: (key = "default") => {
    return getRedisClient(key);
  }
};
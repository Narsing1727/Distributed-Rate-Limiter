const redisClient = require("./redisClient");

async function test() {

  const userId = "testUser";

  const redis = redisClient.getClient(userId);

  await redis.set("testKey", "hello");

  const value = await redis.get("testKey");

  console.log("Redis value:", value);

  process.exit();
}

test();
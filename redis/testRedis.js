const redis = require("./redisClient");

async function test() {

  await redis.set("testKey", "hello");

  const value = await redis.get("testKey");

  console.log("Redis value:", value);

  process.exit();
}

test();
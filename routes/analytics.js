const express = require("express");
const redisClient = require("../redis/redisClient");

const router = express.Router();

router.get("/", async (req, res) => {

  const userId = req.headers["user-id"] || "analytics";

  const redis = redisClient.getClient(userId);

  try {
    const totalRequests = await redis.get("metrics:total_requests");
    const blockedRequests = await redis.get("metrics:blocked_requests");

    const topUsers = await redis.zrevrange(
      "metrics:user_requests",
      0,
      4,
      "WITHSCORES"
    );

    res.json({
      totalRequests: totalRequests || 0,
      blockedRequests: blockedRequests || 0,
      topUsers
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "analytics error" });
  }
});

module.exports = router;
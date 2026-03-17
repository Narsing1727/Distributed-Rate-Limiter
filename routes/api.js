const express = require("express");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

router.get("/test", rateLimiter, (req, res) => {

  res.json({
    message: "Request allowed"
  });

});

module.exports = router;
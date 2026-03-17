const crypto = require("crypto");

function hashKey(key) {
  const hash = crypto.createHash("sha1").update(key).digest("hex");
  return parseInt(hash.substring(0, 8), 16);
}

module.exports = hashKey;
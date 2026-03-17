const Redis = require("ioredis");
const hashKey = require("../router/hash"); 

const nodes = [
  { host: "redis1", port: 6379 },
  { host: "redis2", port: 6379 },
  { host: "redis3", port: 6379 }
];

const clients = nodes.map(node => new Redis(node));

function getRedisClient(key) {
  const hash = hashKey(key);
  const index = hash % clients.length;
  console.log("User:", key, "→ Redis:", index);
  return clients[index];
}

module.exports = { getRedisClient };
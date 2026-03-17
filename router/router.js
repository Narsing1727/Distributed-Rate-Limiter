const crypto = require("crypto");

class ConsistentHashRing {
  constructor(nodes, replicas = 50) {
    this.replicas = replicas;
    this.ring = new Map();
    this.sortedKeys = [];

    nodes.forEach(node => {
      for (let i = 0; i < replicas; i++) {
        const key = this.hash(node + i);
        this.ring.set(key, node);
        this.sortedKeys.push(key);
      }
    });

    this.sortedKeys.sort();
  }

  hash(key) {
    return crypto.createHash("md5").update(key).digest("hex");
  }

  getNode(key) {
    if (this.sortedKeys.length === 0) return null;

    const hash = this.hash(key);

    // find first node clockwise
    for (let i = 0; i < this.sortedKeys.length; i++) {
      if (hash <= this.sortedKeys[i]) {
        return this.ring.get(this.sortedKeys[i]);
      }
    }

    // wrap around
    return this.ring.get(this.sortedKeys[0]);
  }
}

module.exports = ConsistentHashRing;
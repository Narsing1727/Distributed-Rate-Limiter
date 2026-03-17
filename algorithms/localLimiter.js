const buckets = new Map();

function localLimiter(key, capacity = 10) {

  const now = Date.now();

  if (!buckets.has(key)) {
    buckets.set(key, {
      tokens: capacity,
      lastRefill: now
    });
  }

  const bucket = buckets.get(key);

  const elapsed = (now - bucket.lastRefill) / 1000;

  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed);

  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return false;
  }

  bucket.tokens -= 1;

  return true;
}

module.exports = localLimiter;
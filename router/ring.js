const express = require("express");
const axios = require("axios");
const ConsistentHashRing = require("./ring");

const app = express();
app.use(express.json());

// ─── Backend nodes ────────────────────────────────────────────────────────────
const nodes = [
  "http://api1:3000",
  "http://api2:3000",
  "http://api3:3000",
];

// ─── Circuit Breaker config ───────────────────────────────────────────────────
const FAILURE_THRESHOLD = 3;   // failures before marking unhealthy
const RECOVERY_TIME    = 10_000; // ms before a dead node gets a retry chance

/**
 * nodeState schema per node:
 * {
 *   count:     number,   // consecutive network failures
 *   openedAt:  number,   // timestamp when circuit opened (count >= THRESHOLD)
 * }
 */
const nodeState = new Map();

// ─── Hash ring ────────────────────────────────────────────────────────────────
const ring = new ConsistentHashRing(nodes, 50);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the node's circuit is CLOSED (healthy / allowed to try).
 * Auto-transitions OPEN → HALF-OPEN after RECOVERY_TIME so we can probe it.
 */
function isHealthy(node) {
  const state = nodeState.get(node);
  if (!state) return true;                            // never failed

  if (state.count < FAILURE_THRESHOLD) return true;  // failed but below threshold

  // Circuit is OPEN — check if recovery window has passed
  if (Date.now() - state.openedAt > RECOVERY_TIME) {
    console.log(`♻️  Half-open probe allowed: ${node}`);
    // Reset fully so one clean success clears it; one more failure re-opens it
    nodeState.delete(node);
    return true;
  }

  return false; // still OPEN
}

/**
 * Record a network-level failure.
 * Opens the circuit once FAILURE_THRESHOLD is reached.
 */
function recordFailure(node) {
  const state = nodeState.get(node) ?? { count: 0 };
  state.count += 1;
  console.warn(`⚠️  Failure ${state.count}/${FAILURE_THRESHOLD} on ${node}`);

  if (state.count >= FAILURE_THRESHOLD && !state.openedAt) {
    state.openedAt = Date.now();
    console.error(`🚫 Circuit OPEN: ${node}`);
  }

  nodeState.set(node, state);
}

/** Reset state on a clean success (closes the circuit). */
function recordSuccess(node) {
  if (nodeState.has(node)) {
    console.log(`✅ Circuit CLOSED (recovered): ${node}`);
    nodeState.delete(node);
  }
}

/**
 * Pick the next healthy node from the ring, excluding already-tried nodes.
 * We rebuild a temporary ring from the remaining candidates so consistent
 * hashing still drives the selection.
 */
function pickNode(userId, exclude = new Set()) {
  const candidates = nodes.filter(n => !exclude.has(n) && isHealthy(n));

  if (candidates.length === 0) return null;

  // Re-use the global ring when no nodes are excluded (common path),
  // otherwise build a lightweight temp ring from the surviving candidates.
  const targetRing =
    exclude.size === 0 ? ring : new ConsistentHashRing(candidates, 50);

  return targetRing.getNode(userId);
}

// ─── Retry constants ──────────────────────────────────────────────────────────
const MAX_RETRIES = nodes.length; // at most try every node once

/** True for errors that mean the node is unreachable (not a 4xx/5xx reply). */
function isNetworkError(err) {
  return ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(err.code);
}

// ─── Main routing middleware ──────────────────────────────────────────────────
app.use("/api", async (req, res) => {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(400).json({ error: "user-id header required" });
  }

  const tried = new Set();   // nodes we've already attempted this request
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const targetNode = pickNode(userId, tried);

    if (!targetNode) {
      // No healthy node available (all tried or all unhealthy)
      break;
    }

    tried.add(targetNode);
    console.log(`🔄 Attempt ${attempt}: User ${userId} → ${targetNode}`);

    try {
      const response = await axios({
        method: req.method,
        url: targetNode + req.path,   // req.path strips the /api prefix correctly
        params: req.query,
        data: req.body,
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
        timeout: 2_000,
        validateStatus: () => true,   // let us handle all HTTP statuses ourselves
      });

      recordSuccess(targetNode);
      return res.status(response.status).send(response.data);

    } catch (err) {
      lastError = err;
      console.error(`❌ Error on ${targetNode}: ${err.message}`);

      if (isNetworkError(err)) {
        recordFailure(targetNode);
        console.log(`🔁 Retrying with next healthy node…`);
        // Loop continues → picks a different node next iteration
      } else {
        // Non-network error (e.g. axios config issue) — don't retry
        break;
      }
    }
  }

  // All attempts exhausted
  const allOpen = nodes.every(n => !isHealthy(n));
  console.error(`💀 All retries failed. All nodes down: ${allOpen}`);

  return res.status(503).json({
    error: allOpen ? "All nodes are unavailable" : "Request failed after retries",
    detail: lastError?.message ?? "Unknown error",
  });
});

// ─── Health endpoint ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  const status = nodes.map(n => ({
    node: n,
    healthy: isHealthy(n),
    ...(nodeState.get(n) ?? {}),
  }));
  res.json({ router: "ok", nodes: status });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Router running on port ${PORT}`));
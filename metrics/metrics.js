const client = require("prom-client");

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const totalRequests = new client.Counter({
  name: "api_requests_total",
  help: "Total API requests"
});

const blockedRequests = new client.Counter({
  name: "rate_limited_requests_total",
  help: "Total blocked requests"
});

const allowedRequests = new client.Counter({
  name: "allowed_requests_total",
  help: "Total allowed requests"
});

register.registerMetric(totalRequests);
register.registerMetric(blockedRequests);
register.registerMetric(allowedRequests);

module.exports = {
  register,
  totalRequests,
  blockedRequests,
  allowedRequests
};
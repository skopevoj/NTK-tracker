const rateLimit = require("express-rate-limit");

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP",
    message: "Please try again in 15 minutes",
    retryAfter: 15 * 60,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`[RATE-LIMIT] General limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: "Too many requests",
      message: "You have exceeded the rate limit. Please try again later.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// Strict limiter for expensive operations - 20 requests per 15 minutes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: "Too many expensive requests from this IP",
    message: "Please try again in 15 minutes",
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE-LIMIT] Strict limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: "Too many expensive requests",
      message: "You have exceeded the rate limit for data-intensive operations. Please try again later.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// Very strict limiter for export operations - 5 requests per hour
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 exports per hour
  message: {
    error: "Too many export requests from this IP",
    message: "Please try again in 1 hour",
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE-LIMIT] Export limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: "Export rate limit exceeded",
      message: "You have exceeded the rate limit for database exports. Please try again in 1 hour.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// GraphQL limiter - 50 requests per 15 minutes
const graphqlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 GraphQL requests per windowMs
  message: {
    error: "Too many GraphQL requests from this IP",
    message: "Please try again in 15 minutes",
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE-LIMIT] GraphQL limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: "GraphQL rate limit exceeded",
      message: "You have exceeded the rate limit for GraphQL queries. Please try again later.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

// Predict endpoint limiter - 30 requests per 5 minutes (since it's the main endpoint)
const predictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 predict requests per 5 minutes
  message: {
    error: "Too many prediction requests from this IP",
    message: "Please try again in 5 minutes",
    retryAfter: 5 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE-LIMIT] Predict limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      error: "Prediction rate limit exceeded",
      message: "You have exceeded the rate limit for prediction requests. Please try again in a few minutes.",
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
    });
  },
});

module.exports = {
  generalLimiter,
  strictLimiter,
  exportLimiter,
  graphqlLimiter,
  predictLimiter,
};

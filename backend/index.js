const scrapeLibraryOccupancy = require("./scrape/scrapeNTK");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./graphql/schema");
const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit"); // Add this import

// Import rate limiters
const {
  generalLimiter,
  strictLimiter,
  exportLimiter,
  graphqlLimiter,
  predictLimiter,
} = require("./middleware/rateLimiter");

require("dotenv").config();
require("./jobs/scheduler");

const app = express();
const router = express.Router();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set("trust proxy", 1);

// Apply general rate limiting to all API routes
app.use("/api", generalLimiter);

// Request timing and logging middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`[REQ] ${req.method} ${req.url} started at ${new Date().toISOString()} from IP: ${req.ip}`);

  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    const status = res.statusCode >= 400 ? "✗" : "✓";
    console.log(
      `[REQ] ${status} ${req.method} ${req.url} completed in ${duration}ms (${res.statusCode}) - IP: ${req.ip}`
    );

    if (duration > 1000) {
      console.warn(`[SLOW] Request took ${duration}ms: ${req.method} ${req.url} - IP: ${req.ip}`);
    }
  });

  next();
});

// GraphQL setup with rate limiting and fixed extensions function
const rootValue = require("./graphql/resolvers");
router.post(
  "/graphql",
  graphqlLimiter, // Apply GraphQL-specific rate limiting
  graphqlHTTP((req) => ({
    schema,
    rootValue,
    graphiql: process.env.NODE_ENV !== "production", // Disable GraphiQL in production
    introspection: process.env.NODE_ENV !== "production",
    customFormatErrorFn: (error) => {
      console.error("[GRAPHQL] Error:", error.message, "- IP:", req.ip);
      return error;
    },
    extensions: () => {
      const duration = Date.now() - req.startTime;
      console.log(`[GRAPHQL] Query completed in ${duration}ms - IP: ${req.ip}`);
      return {};
    },
  }))
);

// Apply rate limiting to specific routes
const setupPredictRoute = require("./routes/predict");
const setupExportRoute = require("./routes/export");

// Predict route with its own rate limiting
router.get("/predict", predictLimiter, (req, res, next) => {
  // Continue to the actual predict handler
  next();
});
setupPredictRoute(router);

// Export route with very strict rate limiting
router.get("/export", exportLimiter, (req, res, next) => {
  console.log(`[EXPORT] Export requested by IP: ${req.ip} at ${new Date().toISOString()}`);
  next();
});
setupExportRoute(router);

app.use("/api", router);

// Static files with basic rate limiting
const staticPath = path.join(__dirname, "dist");
app.use(
  express.static(staticPath, {
    maxAge: "1h", // Cache static files
    etag: true,
  })
);

// Rate limit for the main page (less strict)
const pageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Allow more requests for the main page
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE-LIMIT] Page limit exceeded for IP: ${req.ip}`);
    res.status(429).send(`
      <html>
        <head><title>Rate Limited</title></head>
        <body>
          <h1>Too Many Requests</h1>
          <p>You have exceeded the rate limit. Please try again later.</p>
          <p>If you believe this is an error, please contact support.</p>
        </body>
      </html>
    `);
  },
});

app.get("/", pageLimiter, (req, res) => {
  const indexPath = path.join(staticPath, "index.html");
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading index.html:", err, "- IP:", req.ip);
      res.status(500).send("Internal Server Error");
    } else {
      res.set("Cache-Control", "no-cache");
      res.send(data);
    }
  });
});

// Global error handler for rate limiting
app.use((err, req, res, next) => {
  if (err.status === 429) {
    console.warn(`[RATE-LIMIT] Rate limit error for IP: ${req.ip} - ${err.message}`);
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`[INIT] Cache enabled, GraphQL at /api/graphql, Rate limiting active`);
});

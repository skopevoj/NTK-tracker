const scrapeLibraryOccupancy = require("./scrape/scrapeNTK");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./graphql/schema");
const express = require("express");
const path = require("path");
const fs = require("fs");

require("dotenv").config();
require("./jobs/scheduler");

const app = express();
const router = express.Router();

// Request timing and logging middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`[REQ] ${req.method} ${req.url} started at ${new Date().toISOString()}`);

  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    const status = res.statusCode >= 400 ? "✗" : "✓";
    console.log(`[REQ] ${status} ${req.method} ${req.url} completed in ${duration}ms (${res.statusCode})`);

    if (duration > 1000) {
      console.warn(`[SLOW] Request took ${duration}ms: ${req.method} ${req.url}`);
    }
  });

  next();
});

// GraphQL setup with fixed extensions function
const rootValue = require("./graphql/resolvers");
router.post(
  "/graphql",
  graphqlHTTP((req) => ({
    schema,
    rootValue,
    graphiql: true,
    customFormatErrorFn: (error) => {
      console.error("[GRAPHQL] Error:", error.message);
      return error;
    },
    extensions: () => {
      const duration = Date.now() - req.startTime;
      console.log(`[GRAPHQL] Query completed in ${duration}ms`);
      return {};
    },
  }))
);
app.use("/api", router);

// Predict route setup
const setupPredictRoute = require("./routes/predict");
setupPredictRoute(router);

// Export route setup
const setupExportRoute = require("./routes/export");
setupExportRoute(router);

const staticPath = path.join(__dirname, "dist");
app.use(express.static(staticPath));

app.get("/", (req, res) => {
  const indexPath = path.join(staticPath, "index.html");
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading index.html:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.send(data);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`[INIT] Cache enabled, GraphQL at /api/graphql`);
});

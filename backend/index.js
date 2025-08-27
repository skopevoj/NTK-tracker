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

// GraphQL setup
const rootValue = require("./graphql/resolvers");
router.post(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue,
    graphiql: true,
  })
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
});

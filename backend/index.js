const scrapeLibraryOccupancy = require('./scrape/scrapeNTK');
const { graphqlHTTP } = require("express-graphql");
const { getOccupancyHistory, insertOccupancy } = require("./db/occupancy");
const schema = require("./graphql/schema");
const express= require('express');
const app = express();
require('dotenv').config();

const router = express.Router();

app.use("/api", router);

router.post("/graphql", graphqlHTTP({
    schema,
    rootValue: {
      occupancyHistory: async ({ limit }) => await getOccupancyHistory(limit || 50),
    },
    graphiql: true,
}));

(async () => {
    const occupancy = 500; //await scrapeLibraryOccupancy();
    console.log(`Library occupancy fetched: ${occupancy}`);
})();

const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
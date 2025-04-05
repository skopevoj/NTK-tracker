const scrapeLibraryOccupancy = require('./scrape/scrapeNTK');
const { graphqlHTTP } = require("express-graphql");
const { getOccupancyHistory, insertOccupancy, dailyAverage, weeklyAverage, monthlyAverage, highestOccupancy, currentOccupancy } = require("./db/occupancy");
const schema = require("./graphql/schema");
const express= require('express');
const path = require('path');
const fs = require("fs");

require('dotenv').config();
require('./jobs/scheduler');

const app = express();
const router = express.Router();

router.post("/graphql", graphqlHTTP({
    schema,
    rootValue: {
        occupancyHistory: async ({ limit }) => await getOccupancyHistory(limit || 50),
        dailyAverage: async ({ date }) => await dailyAverage(date),
        weeklyAverage: async ({ startDate, endDate }) => await weeklyAverage(startDate, endDate),
        monthlyAverage: async ({ month }) => await monthlyAverage(month),
        highestOccupancy: async () => await highestOccupancy(),
        currentOccupancy: async () => await currentOccupancy(),
    },
    graphiql: true,
}));
app.use("/api", router);

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
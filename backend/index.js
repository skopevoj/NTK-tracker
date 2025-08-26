const scrapeLibraryOccupancy = require("./scrape/scrapeNTK");
const { graphqlHTTP } = require("express-graphql");
const {
  getOccupancyHistory,
  insertOccupancy,
  dailyAverage,
  highestOccupancy,
  currentOccupancy,
  getOccupancyByDayOfWeek,
} = require("./db/occupancy");
const schema = require("./graphql/schema");
const express = require("express");
const path = require("path");
const fs = require("fs");

require("dotenv").config();
require("./jobs/scheduler");

const app = express();
const router = express.Router();

router.post(
  "/graphql",
  graphqlHTTP({
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
  })
);
app.use("/api", router);

router.get("/predict", async (req, res) => {
  const type = req.query.type; // 'today' or 'tomorrow'
  const date = req.query.date ? new Date(req.query.date) : new Date();
  // Determine day of week using Prague local date
  const pragueDay = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Prague" }));
  const dayOfWeek = pragueDay.getDay();

  const historicalData = await getOccupancyByDayOfWeek(dayOfWeek);

  // Helper: get Prague "HH:MM" label from a Date-like value
  const toPragueHHMM = (d) => {
    if (!d) return null;
    // If backend DB helper already returned a Prague-local string like "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
    if (typeof d === "string") {
      const m = d.match(/\d{2}:\d{2}/);
      if (m) return m[0];
    }
    // Fallback: format Date object in Prague timezone
    try {
      const ds = new Date(d).toLocaleString("sv-SE", { timeZone: "Europe/Prague" }); // "YYYY-MM-DD HH:MM:SS"
      const parts = ds.split(" ");
      return parts[1].slice(0, 5); // "HH:MM"
    } catch {
      return null;
    }
  };

  const averagedHistoricalPredictions = {};
  for (const row of historicalData) {
    const time = toPragueHHMM(row.timestamp);
    if (!averagedHistoricalPredictions[time]) {
      averagedHistoricalPredictions[time] = [];
    }
    averagedHistoricalPredictions[time].push(row.people_count);
  }

  for (const time in averagedHistoricalPredictions) {
    const counts = averagedHistoricalPredictions[time];
    const average = counts.reduce((a, b) => a + b, 0) / counts.length;
    averagedHistoricalPredictions[time] = Math.round(average);
  }

  // Ensure averagedHistoricalPredictions has a value for every 15-minute interval
  const fullDayHistoricalPredictions = {};
  for (let i = 0; i < 24 * 4; i++) {
    const hour = Math.floor(i / 4)
      .toString()
      .padStart(2, "0");
    const minute = ((i % 4) * 15).toString().padStart(2, "0");
    const time = `${hour}:${minute}`;
    fullDayHistoricalPredictions[time] =
      averagedHistoricalPredictions[time] !== undefined ? averagedHistoricalPredictions[time] : null;
  }

  // Calculate overall average for fallback
  const allHistoricalValues = Object.values(averagedHistoricalPredictions).filter((val) => val !== null);
  const overallAverage =
    allHistoricalValues.length > 0
      ? Math.round(allHistoricalValues.reduce((a, b) => a + b, 0) / allHistoricalValues.length)
      : 0;

  for (const time in fullDayHistoricalPredictions) {
    if (fullDayHistoricalPredictions[time] === null) {
      fullDayHistoricalPredictions[time] = overallAverage;
    }
  }

  if (type === "today") {
    const todayUTC = new Date().toISOString().split("T")[0]; // Get today's date in UTC
    const currentDayData = await dailyAverage(todayUTC);
    const predictions = {};

    // Helper to get Prague hour/minute and round to previous 15-min slot
    const roundToPrevious15Prague = (date) => {
      // produce Prague "YYYY-MM-DD HH:MM:SS"
      const pragueStr = new Date(date).toLocaleString("sv-SE", { timeZone: "Europe/Prague" });
      const [datePart, timePart] = pragueStr.split(" ");
      const [hourStr, minuteStr] = timePart.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const rounded = Math.floor(minute / 15) * 15;
      return `${hour.toString().padStart(2, "0")}:${rounded.toString().padStart(2, "0")}`;
    };

    // Prefer the live current occupancy as anchor if available
    let lastDataPointTime = null;
    let lastDataPointValue = null;
    try {
      const live = await currentOccupancy(); // uses DB function (now returns Prague-local timestamp string)
      if (live && live.timestamp && typeof live.people_count === "number") {
        // live.timestamp is Prague-local "YYYY-MM-DDTHH:MM:SS"
        const liveDate = new Date(live.timestamp.replace("T", " ")); // parse into Date; this is local-like string but we only extract Prague-local parts below
        lastDataPointTime = roundToPrevious15Prague(liveDate);
        lastDataPointValue = live.people_count;
      }
    } catch (e) {
      // fall back silently to dailyAverage below
    }

    // If live current not available, use last point from dailyAverage (existing behavior)
    if ((!lastDataPointTime || lastDataPointValue === null) && currentDayData.length > 0) {
      const lastDataPoint = currentDayData[currentDayData.length - 1];
      // lastDataPoint.interval_start is now Prague-local "YYYY-MM-DDTHH:MM:SS"
      lastDataPointTime = toPragueHHMM(lastDataPoint.interval_start);
      lastDataPointValue = lastDataPoint.average_count;
    }

    // Compute offset relative to historical baseline at the anchor time (if present)
    let offset = 0;
    if (lastDataPointTime && fullDayHistoricalPredictions[lastDataPointTime] !== undefined) {
      offset = lastDataPointValue - fullDayHistoricalPredictions[lastDataPointTime];
    }

    for (let i = 0; i < 24 * 4; i++) {
      // 15-minute intervals for 24 hours
      const hour = Math.floor(i / 4)
        .toString()
        .padStart(2, "0");
      const minute = ((i % 4) * 15).toString().padStart(2, "0");
      const time = `${hour}:${minute}`;

      // Keep earlier times empty (no prediction), but ensure the anchor slot has the current value
      if (lastDataPointTime && time < lastDataPointTime) {
        predictions[time] = null; // No prediction for times before the last data point
      } else if (time === lastDataPointTime) {
        // anchor prediction equals the live/current value so lines meet exactly
        predictions[time] = lastDataPointValue !== null ? Math.max(0, lastDataPointValue) : null;
      } else {
        const predictedVal = fullDayHistoricalPredictions[time];
        predictions[time] = predictedVal !== null ? Math.max(0, predictedVal + offset) : null; // Apply offset, ensure non-negative
      }
    }
    res.json(predictions);
  } else if (type === "tomorrow") {
    // Return only the window from 06:00 to 12:00 (inclusive) for tomorrow's prediction
    const start = "06:00";
    const end = "22:00";
    const sliced = {};
    const keys = Object.keys(fullDayHistoricalPredictions).sort();
    for (const k of keys) {
      if (k >= start && k <= end) {
        sliced[k] = fullDayHistoricalPredictions[k];
      }
    }
    res.json(sliced);
  } else {
    res.status(400).json({ error: "Invalid prediction type. Use 'today' or 'tomorrow'." });
  }
});

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

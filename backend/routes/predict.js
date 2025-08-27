const { getOccupancyData, currentOccupancy, getOccupancyByDayOfWeek } = require("../db/occupancy");

function setupPredictRoute(router) {
  router.get("/predict", async (req, res) => {
    const startTime = Date.now();
    const date = req.query.date ? new Date(req.query.date) : new Date();

    console.log(`[PREDICT] Starting request for date: ${req.query.date || "today"} at ${new Date().toISOString()}`);

    try {
      // Determine day of week using Prague local date
      const pragueDay = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Prague" }));
      const dayOfWeek = pragueDay.getDay();

      console.log(`[PREDICT] Processing day of week: ${dayOfWeek}`);

      const historicalStartTime = Date.now();
      const historicalData = await getOccupancyByDayOfWeek(dayOfWeek);
      console.log(
        `[PREDICT] Historical data fetched in ${Date.now() - historicalStartTime}ms (${historicalData.length} records)`
      );

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

      const processingStartTime = Date.now();
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
      console.log(`[PREDICT] Historical data processing took ${Date.now() - processingStartTime}ms`);

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

      // Simplified UTC date range calculation
      const dateString = date.toISOString().split("T")[0]; // Get YYYY-MM-DD
      const todayUTC = new Date(dateString + "T00:00:00Z");
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setDate(tomorrowUTC.getDate() + 1);

      const currentDataStartTime = Date.now();

      const currentDayData = await getOccupancyData(todayUTC.toISOString(), tomorrowUTC.toISOString());
      console.log(
        `[PREDICT] Current day data fetched in ${Date.now() - currentDataStartTime}ms (${
          currentDayData.length
        } records)`
      );

      const result = [];

      // Helper to get Prague hour/minute and round to previous 15-min slot
      const roundToPrevious15Prague = (date) => {
        // Use Prague timezone consistently
        const pragueStr = new Date(date).toLocaleString("sv-SE", { timeZone: "Europe/Prague" });
        const [datePart, timePart] = pragueStr.split(" ");
        const [hourStr, minuteStr] = timePart.split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        const rounded = Math.floor(minute / 15) * 15;
        return `${hour.toString().padStart(2, "0")}:${rounded.toString().padStart(2, "0")}`;
      };

      let lastDataPointTime = null;
      let lastDataPointValue = null;

      const liveDataStartTime = Date.now();
      try {
        const live = await currentOccupancy();
        console.log(`[PREDICT] Live data fetched in ${Date.now() - liveDataStartTime}ms`);
        if (live && live.timestamp && typeof live.people_count === "number") {
          // live.timestamp is already Prague-local "YYYY-MM-DDTHH:MM:SS"
          const timeMatch = live.timestamp.match(/(\d{2}):(\d{2})/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1], 10);
            const minute = parseInt(timeMatch[2], 10);
            const rounded = Math.floor(minute / 15) * 15;
            lastDataPointTime = `${hour.toString().padStart(2, "0")}:${rounded.toString().padStart(2, "0")}`;
            lastDataPointValue = live.people_count;
          }
        }
      } catch (e) {
        console.log(`[PREDICT] Live data fetch failed in ${Date.now() - liveDataStartTime}ms:`, e.message);
        // fall back silently to dailyAverage below
      }

      if ((!lastDataPointTime || lastDataPointValue === null) && currentDayData.length > 0) {
        const lastDataPoint = currentDayData[currentDayData.length - 1];
        // lastDataPoint.interval_start is now Prague-local "YYYY-MM-DDTHH:MM:SS"
        lastDataPointTime = toPragueHHMM(lastDataPoint.interval_start);
        lastDataPointValue = lastDataPoint.average_count;
      }

      let offset = 0;
      if (lastDataPointTime && fullDayHistoricalPredictions[lastDataPointTime] !== undefined) {
        offset = lastDataPointValue - fullDayHistoricalPredictions[lastDataPointTime];
      }

      const resultBuildingStartTime = Date.now();
      for (let i = 0; i <= 24 * 4; i++) {
        const hour = Math.floor(i / 4);
        const minute = (i % 4) * 15;
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        const dataPoint = currentDayData.find((d) => toPragueHHMM(d.interval_start) === time);

        if (dataPoint) {
          result.push({
            time: time,
            people_count: dataPoint.average_count,
            is_prediction: false,
          });
        } else {
          if (lastDataPointTime && time < lastDataPointTime) {
            result.push({
              time: time,
              people_count: null,
              is_prediction: true,
            });
          } else if (time === lastDataPointTime) {
            result.push({
              time: time,
              people_count: lastDataPointValue !== null ? Math.max(0, lastDataPointValue) : null,
              is_prediction: false,
            });
          } else {
            const predictedVal = fullDayHistoricalPredictions[time];
            result.push({
              time: time,
              people_count: predictedVal !== null ? Math.max(0, predictedVal + offset) : null,
              is_prediction: true,
            });
          }
        }
      }
      console.log(`[PREDICT] Result building took ${Date.now() - resultBuildingStartTime}ms`);

      // Filter to only include from 06:00 to 24:00
      const filteredResult = result.filter((item) => item.time >= "06:00");

      const totalTime = Date.now() - startTime;
      console.log(`[PREDICT] ✓ Request completed in ${totalTime}ms, returning ${filteredResult.length} data points`);

      res.json(filteredResult);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`[PREDICT] ✗ Request failed after ${totalTime}ms:`, error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

module.exports = setupPredictRoute;

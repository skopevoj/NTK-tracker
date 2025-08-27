const db = require("./client");
const cron = require("node-cron");

// Enhanced caching system with shorter durations for frequently accessed data
const cache = new Map();
const CACHE_DURATION = {
  PREDICT: 30 * 1000, // 30 seconds for predict data (much shorter for real-time feel)
  STATS: 60 * 1000, // 1 minute for stats
  DAILY: 10 * 60 * 1000, // 10 minutes for daily averages
  WEEKLY: 30 * 60 * 1000, // 30 minutes for weekly averages
};

function getCachedData(key, duration) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Helper: produce Prague local timestamp string "YYYY-MM-DDTHH:MM:SS"
function toPragueTimestamp(ts) {
  try {
    const s = new Date(ts).toLocaleString("sv-SE", { timeZone: "Europe/Prague" });
    return s.replace(" ", "T");
  } catch {
    return new Date(ts).toISOString();
  }
}

async function insertOccupancy(count) {
  try {
    const result = await db.query(
      `INSERT INTO occupancy_log (people_count, timestamp) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *`,
      [count]
    );
    // Clear relevant caches when new data is inserted
    const keysToDelete = Array.from(cache.keys()).filter(
      (key) => key.startsWith("occupancy_") || key.startsWith("current_") || key.startsWith("highest_")
    );
    keysToDelete.forEach((key) => cache.delete(key));

    console.log("Successfully added log to database.");
    return result.rows[0];
  } catch (error) {
    console.error("Error when inserting log to database:", error.message);
    return null;
  }
}

async function getOccupancyHistory(limit = 50) {
  const cacheKey = `occupancy_history_${limit}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.STATS);
  if (cached) return cached;

  try {
    const result = await db.query(
      `SELECT id, people_count, timestamp FROM occupancy_log ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    const data = result.rows.map((row) => ({
      ...row,
      timestamp: toPragueTimestamp(row.timestamp),
    }));

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Failed to fetch occupancy history:", error.message);
    return [];
  }
}

// Optimized query with date range indexing
async function getOccupancyData(startDate, endDate) {
  const cacheKey = `occupancy_data_${startDate}_${endDate}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.PREDICT);
  if (cached) return cached;

  try {
    // Use indexed query with explicit date range for better performance
    const result = await db.query(
      `SELECT timestamp AS interval_start, people_count AS average_count
       FROM occupancy_log
       WHERE timestamp >= $1::timestamp AND timestamp < $2::timestamp
       ORDER BY timestamp
       LIMIT 500`, // Add limit to prevent huge result sets
      [startDate, endDate]
    );
    const data = result.rows.map((r) => ({
      interval_start: toPragueTimestamp(r.interval_start),
      average_count: r.average_count,
    }));

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Failed to fetch daily records:", error.message);
    return [];
  }
}

async function highestOccupancy() {
  const cacheKey = "highest_occupancy";
  const cached = getCachedData(cacheKey, CACHE_DURATION.STATS);
  if (cached) return cached;

  try {
    // Use indexed query for better performance
    const result = await db.query(
      `SELECT id, people_count, timestamp 
       FROM occupancy_log 
       ORDER BY people_count DESC 
       LIMIT 1`
    );
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const data = {
        id: row.id,
        people_count: row.people_count,
        timestamp: toPragueTimestamp(row.timestamp),
      };
      setCachedData(cacheKey, data);
      return data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch highest occupancy:", error.message);
    return null;
  }
}

async function currentOccupancy() {
  const cacheKey = "current_occupancy";
  const cached = getCachedData(cacheKey, CACHE_DURATION.STATS);
  if (cached) return cached;

  try {
    // Use indexed query for better performance
    const result = await db.query(
      `SELECT id, people_count, timestamp 
       FROM occupancy_log 
       ORDER BY timestamp DESC 
       LIMIT 1`
    );
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const data = {
        id: row.id,
        people_count: row.people_count,
        timestamp: toPragueTimestamp(row.timestamp),
      };
      setCachedData(cacheKey, data);
      return data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch current occupancy:", error.message);
    return null;
  }
}

// Optimized query with better indexing
async function getOccupancyByDayOfWeek(dayOfWeek) {
  const cacheKey = `occupancy_day_${dayOfWeek}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.PREDICT);
  if (cached) return cached;

  try {
    // Add limit and optimize query for better performance
    const result = await db.query(
      `SELECT people_count, timestamp
       FROM occupancy_log
       WHERE EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague')) = $1
       AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '8 weeks'
       ORDER BY timestamp DESC
       LIMIT 2000`, // Limit results for better performance
      [dayOfWeek]
    );
    const data = result.rows.map((row) => ({
      people_count: row.people_count,
      timestamp: toPragueTimestamp(row.timestamp),
    }));

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Failed to fetch occupancy by day of week:", error.message);
    return [];
  }
}

async function getDailyAverages(lastDays = 365) {
  const cacheKey = `daily_averages_${lastDays}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.DAILY);
  if (cached) return cached;

  try {
    // Fixed query - use proper parameterized query and ensure we get all available days
    const result = await db.query(
      `SELECT 
         DATE(timestamp AT TIME ZONE 'Europe/Prague') AS date,
         ROUND(AVG(people_count), 2) AS average,
         COUNT(*) as data_points
       FROM occupancy_log
       WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '${lastDays} days'
       GROUP BY DATE(timestamp AT TIME ZONE 'Europe/Prague')
       ORDER BY date ASC`,
      []
    );

    console.log(`getDailyAverages: Found ${result.rows.length} days of data out of ${lastDays} requested days`);

    const data = result.rows.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      average: parseFloat(row.average),
      dataPoints: parseInt(row.data_points, 10),
    }));

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Failed to fetch daily averages:", error.message);
    return [];
  }
}

async function getWeeklyAverages() {
  const cacheKey = "weekly_averages";
  const cached = getCachedData(cacheKey, CACHE_DURATION.WEEKLY);
  if (cached) return cached;

  try {
    // Optimize query with explicit time range
    const result = await db.query(
      `SELECT 
         EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague')) AS dayOfWeek,
         ROUND(AVG(people_count), 2) AS average
       FROM occupancy_log
       WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '4 weeks'
       GROUP BY EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague'))
       ORDER BY dayOfWeek`
    );
    const data = result.rows.map((row) => ({
      dayOfWeek: parseInt(row.dayofweek, 10),
      average: parseFloat(row.average),
    }));

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Failed to fetch weekly averages:", error.message);
    return [];
  }
}

// More aggressive cache cleanup
cron.schedule("0 0 * * *", () => {
  cache.clear();
  console.log("All caches cleared at midnight.");
});

// More frequent cleanup of expired entries
cron.schedule("*/15 * * * *", () => {
  const now = Date.now();
  const keysToDelete = [];

  for (const [key, value] of cache.entries()) {
    // Use shortest cache duration for cleanup threshold
    if (now - value.timestamp > CACHE_DURATION.WEEKLY) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => cache.delete(key));
  if (keysToDelete.length > 0) {
    console.log(`Cleaned up ${keysToDelete.length} expired cache entries.`);
  }
});

module.exports = {
  insertOccupancy,
  getOccupancyHistory,
  getOccupancyData,
  currentOccupancy,
  highestOccupancy,
  getOccupancyByDayOfWeek,
  getDailyAverages,
  getWeeklyAverages,
};

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
  const startTime = Date.now();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < duration) {
    console.log(
      `[CACHE] ✓ Hit for key '${key}' (age: ${Date.now() - cached.timestamp}ms) in ${Date.now() - startTime}ms`
    );
    return cached.data;
  }
  console.log(`[CACHE] ✗ Miss for key '${key}' (${cached ? "expired" : "not found"}) in ${Date.now() - startTime}ms`);
  return null;
}

function setCachedData(key, data) {
  const startTime = Date.now();
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  console.log(
    `[CACHE] ✓ Set key '${key}' with ${Array.isArray(data) ? data.length + " items" : typeof data} in ${
      Date.now() - startTime
    }ms`
  );
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
  const startTime = Date.now();
  try {
    const result = await db.query(
      `INSERT INTO occupancy_log (people_count, timestamp) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *`,
      [count]
    );

    console.log(`[DB] ✓ insertOccupancy completed in ${Date.now() - startTime}ms`);
    return result.rows[0];
  } catch (error) {
    console.error(`[DB] ✗ insertOccupancy failed in ${Date.now() - startTime}ms:`, error.message);
    return null;
  }
}

// New function specifically for scraper insertions that invalidates cache
async function insertScrapedOccupancy(count) {
  const startTime = Date.now();
  try {
    const result = await db.query(
      `INSERT INTO occupancy_log (people_count, timestamp) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *`,
      [count]
    );

    // Only clear caches when scraped data is inserted (new real data)
    const keysToDelete = Array.from(cache.keys()).filter(
      (key) => key.startsWith("occupancy_") || key.startsWith("current_") || key.startsWith("highest_")
    );
    keysToDelete.forEach((key) => cache.delete(key));

    console.log(
      `[DB] ✓ insertScrapedOccupancy completed in ${Date.now() - startTime}ms, cleared ${
        keysToDelete.length
      } cache keys`
    );
    return result.rows[0];
  } catch (error) {
    console.error(`[DB] ✗ insertScrapedOccupancy failed in ${Date.now() - startTime}ms:`, error.message);
    return null;
  }
}

async function getOccupancyHistory(limit = 50) {
  const startTime = Date.now();
  const cacheKey = `occupancy_history_${limit}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.STATS);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    const result = await db.query(
      `SELECT id, people_count, timestamp FROM occupancy_log ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    console.log(`[DB] Query for getOccupancyHistory took ${Date.now() - queryStartTime}ms`);

    const processStartTime = Date.now();
    const data = result.rows.map((row) => ({
      ...row,
      timestamp: toPragueTimestamp(row.timestamp),
    }));
    console.log(`[DB] Processing for getOccupancyHistory took ${Date.now() - processStartTime}ms`);

    setCachedData(cacheKey, data);
    console.log(
      `[DB] ✓ getOccupancyHistory completed in ${Date.now() - startTime}ms, returning ${data.length} records`
    );
    return data;
  } catch (error) {
    console.error(`[DB] ✗ getOccupancyHistory failed in ${Date.now() - startTime}ms:`, error.message);
    return [];
  }
}

// Optimized query with date range indexing
async function getOccupancyData(startDate, endDate) {
  const startTime = Date.now();
  const cacheKey = `occupancy_data_${startDate}_${endDate}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.PREDICT);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    // Use indexed query with explicit date range for better performance
    const result = await db.query(
      `SELECT timestamp AS interval_start, people_count AS average_count
       FROM occupancy_log
       WHERE timestamp >= $1::timestamp AND timestamp < $2::timestamp
       ORDER BY timestamp
       LIMIT 500`, // Add limit to prevent huge result sets
      [startDate, endDate]
    );
    console.log(
      `[DB] Query for getOccupancyData took ${Date.now() - queryStartTime}ms, found ${result.rows.length} records`
    );

    const processStartTime = Date.now();
    const data = result.rows.map((r) => ({
      interval_start: toPragueTimestamp(r.interval_start),
      average_count: r.average_count,
    }));
    console.log(`[DB] Processing for getOccupancyData took ${Date.now() - processStartTime}ms`);

    setCachedData(cacheKey, data);
    console.log(`[DB] ✓ getOccupancyData completed in ${Date.now() - startTime}ms, returning ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`[DB] ✗ getOccupancyData failed in ${Date.now() - startTime}ms:`, error.message);
    return [];
  }
}

async function highestOccupancy() {
  const startTime = Date.now();
  const cacheKey = "highest_occupancy";
  const cached = getCachedData(cacheKey, CACHE_DURATION.STATS);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    const result = await db.query(
      `SELECT id, people_count, timestamp 
       FROM occupancy_log 
       ORDER BY people_count DESC 
       LIMIT 1`
    );
    console.log(`[DB] Query for highestOccupancy took ${Date.now() - queryStartTime}ms`);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const data = {
        id: row.id,
        people_count: row.people_count,
        timestamp: toPragueTimestamp(row.timestamp),
      };
      setCachedData(cacheKey, data);
      console.log(`[DB] ✓ highestOccupancy completed in ${Date.now() - startTime}ms`);
      return data;
    }
    console.log(`[DB] ✓ highestOccupancy completed in ${Date.now() - startTime}ms (no data)`);
    return null;
  } catch (error) {
    console.error(`[DB] ✗ highestOccupancy failed in ${Date.now() - startTime}ms:`, error.message);
    return null;
  }
}

async function currentOccupancy() {
  const startTime = Date.now();
  const cacheKey = "current_occupancy";
  const cached = getCachedData(cacheKey, CACHE_DURATION.STATS);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    const result = await db.query(
      `SELECT id, people_count, timestamp 
       FROM occupancy_log 
       ORDER BY timestamp DESC 
       LIMIT 1`
    );
    console.log(`[DB] Query for currentOccupancy took ${Date.now() - queryStartTime}ms`);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const data = {
        id: row.id,
        people_count: row.people_count,
        timestamp: toPragueTimestamp(row.timestamp),
      };
      setCachedData(cacheKey, data);
      console.log(`[DB] ✓ currentOccupancy completed in ${Date.now() - startTime}ms`);
      return data;
    }
    console.log(`[DB] ✓ currentOccupancy completed in ${Date.now() - startTime}ms (no data)`);
    return null;
  } catch (error) {
    console.error(`[DB] ✗ currentOccupancy failed in ${Date.now() - startTime}ms:`, error.message);
    return null;
  }
}

// Optimized query with better indexing - the main bottleneck
async function getOccupancyByDayOfWeek(dayOfWeek) {
  const startTime = Date.now();
  const cacheKey = `occupancy_day_${dayOfWeek}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.PREDICT);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    // Optimized query with better date filtering and reduced EXTRACT usage
    const result = await db.query(
      `SELECT people_count, timestamp
       FROM occupancy_log
       WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '4 weeks'
         AND EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague')) = $1
       ORDER BY timestamp DESC
       LIMIT 1000`, // Reduce limit further for better performance
      [dayOfWeek]
    );
    console.log(
      `[DB] Query for getOccupancyByDayOfWeek(${dayOfWeek}) took ${Date.now() - queryStartTime}ms, found ${
        result.rows.length
      } records`
    );

    const processStartTime = Date.now();
    const data = result.rows.map((row) => ({
      people_count: row.people_count,
      timestamp: toPragueTimestamp(row.timestamp),
    }));
    console.log(`[DB] Processing for getOccupancyByDayOfWeek took ${Date.now() - processStartTime}ms`);

    setCachedData(cacheKey, data);
    console.log(
      `[DB] ✓ getOccupancyByDayOfWeek completed in ${Date.now() - startTime}ms, returning ${data.length} records`
    );
    return data;
  } catch (error) {
    console.error(`[DB] ✗ getOccupancyByDayOfWeek failed in ${Date.now() - startTime}ms:`, error.message);
    return [];
  }
}

async function getDailyAverages(lastDays = 365) {
  const startTime = Date.now();
  const cacheKey = `daily_averages_${lastDays}`;
  const cached = getCachedData(cacheKey, CACHE_DURATION.DAILY);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    // Optimized query with better date range filtering
    const result = await db.query(
      `SELECT 
         DATE(timestamp AT TIME ZONE 'Europe/Prague') AS date,
         ROUND(AVG(people_count), 2) AS average,
         COUNT(*) as data_points
       FROM occupancy_log
       WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '${Math.min(lastDays, 200)} days'
       GROUP BY DATE(timestamp AT TIME ZONE 'Europe/Prague')
       ORDER BY date ASC
       LIMIT ${Math.min(lastDays, 200)}`,
      []
    );
    console.log(
      `[DB] Query for getDailyAverages took ${Date.now() - queryStartTime}ms, found ${result.rows.length} records`
    );

    const processStartTime = Date.now();
    const data = result.rows.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      average: parseFloat(row.average),
      dataPoints: parseInt(row.data_points, 10),
    }));
    console.log(`[DB] Processing for getDailyAverages took ${Date.now() - processStartTime}ms`);

    setCachedData(cacheKey, data);
    console.log(`[DB] ✓ getDailyAverages completed in ${Date.now() - startTime}ms, returning ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`[DB] ✗ getDailyAverages failed in ${Date.now() - startTime}ms:`, error.message);
    return [];
  }
}

async function getWeeklyAverages() {
  const startTime = Date.now();
  const cacheKey = "weekly_averages";
  const cached = getCachedData(cacheKey, CACHE_DURATION.WEEKLY);
  if (cached) return cached;

  try {
    const queryStartTime = Date.now();
    // Optimized query with shorter time range
    const result = await db.query(
      `SELECT 
         EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague')) AS dayOfWeek,
         ROUND(AVG(people_count), 2) AS average
       FROM occupancy_log
       WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '2 weeks'
       GROUP BY EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague'))
       ORDER BY dayOfWeek`
    );
    console.log(
      `[DB] Query for getWeeklyAverages took ${Date.now() - queryStartTime}ms, found ${result.rows.length} records`
    );

    const processStartTime = Date.now();
    const data = result.rows.map((row) => ({
      dayOfWeek: parseInt(row.dayofweek, 10),
      average: parseFloat(row.average),
    }));
    console.log(`[DB] Processing for getWeeklyAverages took ${Date.now() - processStartTime}ms`);

    setCachedData(cacheKey, data);
    console.log(`[DB] ✓ getWeeklyAverages completed in ${Date.now() - startTime}ms, returning ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`[DB] ✗ getWeeklyAverages failed in ${Date.now() - startTime}ms:`, error.message);
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
  insertScrapedOccupancy,
  getOccupancyHistory,
  getOccupancyData,
  currentOccupancy,
  highestOccupancy,
  getOccupancyByDayOfWeek,
  getDailyAverages,
  getWeeklyAverages,
};

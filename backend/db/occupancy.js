const db = require("./client");

async function insertScrapedOccupancy(count) {
  const startTime = Date.now();
  try {
    const result = await db.query(
      `INSERT INTO occupancy_log (people_count, timestamp) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *`,
      [count]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`insertScrapedOccupancy failed in ${Date.now() - startTime}ms:`, error.message);
    return null;
  }
}

module.exports = {
  insertScrapedOccupancy,
};

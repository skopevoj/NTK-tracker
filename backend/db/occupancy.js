const db = require('./client');

async function insertOccupancy(count) {
    try {
        const result = await db.query(
            `INSERT INTO occupancy_log (people_count, timestamp) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *`,
            [count]
        );
        console.log("Successfully added log to database.");
        return result.rows[0];
    } catch (error) {
        console.error('Error when inserting log to database:', error.message);
        return null;
    }
}

async function getOccupancyHistory(limit = 50) {
    try {
        const result = await db.query(
            `SELECT id, people_count, timestamp FROM occupancy_log ORDER BY timestamp DESC LIMIT $1`,
            [limit]
        );
        return result.rows.map(row => ({
            ...row,
            timestamp: new Date(row.timestamp).toISOString(), // Convert to ISO 8601
        }));
    } catch (error) {
        console.error("Failed to fetch occupancy history:", error.message);
        return [];
    }
}

insertOccupancy(650);

module.exports = {
 insertOccupancy,
 getOccupancyHistory
}
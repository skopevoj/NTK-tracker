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
            timestamp: new Date(row.timestamp).toISOString(),
        }));
    } catch (error) {
        console.error("Failed to fetch occupancy history:", error.message);
        return [];
    }
}

async function weeklyAverage(startDate, endDate) {
    try {
        const result = await db.query(
            `SELECT 
                DATE_TRUNC('hour', timestamp) AS interval_start,
                AVG(people_count) AS average_count
             FROM occupancy_log
             WHERE DATE(timestamp) BETWEEN $1 AND $2
             GROUP BY interval_start
             ORDER BY interval_start`,
            [startDate, endDate]
        );
        return result.rows;
    } catch (error) {
        console.error("Failed to fetch weekly average:", error.message);
        return [];
    }
}

async function monthlyAverage(month) {
    try {
        const result = await db.query(
            `SELECT 
                DATE_TRUNC('day', timestamp) AS interval_start,
                AVG(people_count) AS average_count
             FROM occupancy_log
             WHERE TO_CHAR(timestamp, 'YYYY-MM') = $1
             GROUP BY interval_start
             ORDER BY interval_start`,
            [month]
        );
        return result.rows;
    } catch (error) {
        console.error("Failed to fetch monthly average:", error.message);
        return [];
    }
}

async function dailyAverage(date) {
    try {
        const result = await db.query(
            `SELECT 
                DATE_TRUNC('minute', timestamp) + 
                (FLOOR(EXTRACT(MINUTE FROM timestamp) / 10) * INTERVAL '10 minutes') AS interval_start,
                AVG(people_count) AS average_count
             FROM occupancy_log
             WHERE DATE(timestamp) = $1
               AND EXTRACT(HOUR FROM timestamp) BETWEEN 6 AND 24
             GROUP BY interval_start
             ORDER BY interval_start`,
            [date]
        );
        return result.rows;
    } catch (error) {
        console.error("Failed to fetch daily average:", error.message);
        return [];
    }
}


module.exports = {
 insertOccupancy,
 getOccupancyHistory,
 dailyAverage,
 monthlyAverage,
 weeklyAverage
}
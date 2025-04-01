const db = require('./client');

async function insertOccupancy(count){
    try{
        const result = await db.query(
            `INSERT INTO occupancy_log (people_count) VALUES ($1) RETURNING *`,
            [count]
        );
        console.log("Succsfully added log to database.");
        return result.rows[0];
    }
    catch(error){
        console.error('Error when inserting log to database.');
        return null;
    }
}

async function getOccupancyHistory(limit = 50) {
    try {
      const result = await db.query(
        `SELECT * FROM occupancy_log ORDER BY timestamp DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error("Failed to fetch occupancy history:", error.message);
      return [];
    }
}

module.exports = {
 insertOccupancy,
 getOccupancyHistory
}
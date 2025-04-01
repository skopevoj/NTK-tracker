const db = require('./client');

async function insertOccupancy(count){
    try{
        const result = await db.query(
            `INSERT INTO occupancy_log (people_count) VALUES ($1) RETURNING *`,
            [count]
        );
        return result.rows[0];
    }
    catch(error){
        console.error('Error when inserting log to database.');
        return null;
    }
}
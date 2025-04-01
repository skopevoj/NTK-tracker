const client = require('./client');

async function clearDatabase() {
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE occupancy_log CASCADE');
        await client.query('COMMIT');
        console.log('Database cleared successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error clearing the database:', error);
    } finally {
        await client.end();
    }
}

clearDatabase();
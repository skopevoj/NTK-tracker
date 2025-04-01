const db = require('./client');

async function migrate() {
  try {
    console.log("Creating table `occupancy_log` if it doesn't exist...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS occupancy_log (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        people_count INTEGER NOT NULL
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_occupancy_timestamp ON occupancy_log (timestamp);
    `);

    console.log("Migration complete.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();

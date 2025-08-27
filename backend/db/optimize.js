const db = require("./client");

async function optimizeDatabase() {
  try {
    console.log("Starting database optimization...");

    // Drop existing indexes to recreate them optimally
    console.log("Dropping old indexes...");
    await db.query(`DROP INDEX IF EXISTS idx_occupancy_timestamp;`);
    await db.query(`DROP INDEX IF EXISTS idx_occupancy_people_count;`);
    await db.query(`DROP INDEX IF EXISTS idx_occupancy_dow_prague;`);
    await db.query(`DROP INDEX IF EXISTS idx_occupancy_date_prague;`);

    // Create optimized indexes
    console.log("Creating optimized indexes...");

    // Most important: timestamp index for recent data queries
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_occupancy_timestamp_desc 
      ON occupancy_log (timestamp DESC);
    `);

    // Index for people_count queries (highest occupancy)
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_occupancy_people_count_desc 
      ON occupancy_log (people_count DESC);
    `);

    // Composite index for recent timestamp + day of week queries
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_occupancy_recent_dow 
      ON occupancy_log (timestamp DESC, EXTRACT(DOW FROM (timestamp AT TIME ZONE 'Europe/Prague')))
      WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '8 weeks';
    `);

    // Partial index for recent data only (most common queries)
    await db.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_occupancy_recent_only 
      ON occupancy_log (timestamp DESC, people_count)
      WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 year';
    `);

    // Update table statistics
    console.log("Updating table statistics...");
    await db.query(`ANALYZE occupancy_log;`);

    // Get table info
    const tableInfo = await db.query(`
      SELECT 
        COUNT(*) as total_rows,
        MIN(timestamp) as oldest_record,
        MAX(timestamp) as newest_record,
        pg_size_pretty(pg_total_relation_size('occupancy_log')) as table_size
      FROM occupancy_log;
    `);

    console.log("Database optimization complete!");
    console.log("Table info:", tableInfo.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error("Optimization failed:", error.message);
    process.exit(1);
  }
}

optimizeDatabase();

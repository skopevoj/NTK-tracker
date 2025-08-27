const { Pool } = require("pg");
const db = require("../db/client");

function setupExportRoute(router) {
  router.get("/export", async (req, res) => {
    const startTime = Date.now();

    try {
      console.log("Starting database export...");

      // Get all occupancy data
      const result = await db.query(`
        SELECT 
          id,
          people_count,
          timestamp,
          timestamp AT TIME ZONE 'Europe/Prague' as prague_timestamp
        FROM occupancy_log 
        ORDER BY timestamp ASC
      `);

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: result.rows.length,
          exportDurationMs: Date.now() - startTime,
          timezone: "Europe/Prague",
        },
        data: result.rows.map((row) => ({
          id: row.id,
          people_count: row.people_count,
          timestamp_utc: row.timestamp.toISOString(),
          timestamp_prague: row.prague_timestamp.toISOString().replace("T", " ").substring(0, 19),
        })),
      };

      console.log(`Database export completed in ${Date.now() - startTime}ms - ${result.rows.length} records`);

      // Set appropriate headers for JSON download
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ntk-tracker-export-${new Date().toISOString().split("T")[0]}.json"`
      );

      res.json(exportData);
    } catch (error) {
      console.error("Export failed:", error.message);
      res.status(500).json({
        error: "Export failed",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

module.exports = setupExportRoute;

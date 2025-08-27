const db = require("./client");

async function fillDatabase() {
  const now = new Date();
  console.log("Filling database with sample data for the last 60 days.");

  const dataToInsert = [];

  // Generate data for the last 60 days
  for (let daysBack = 60; daysBack >= 0; daysBack--) {
    const currentDay = new Date(now);
    currentDay.setDate(now.getDate() - daysBack);

    console.log(`Generating data for day: ${currentDay.toISOString().slice(0, 10)}`);

    const year = currentDay.getFullYear();
    const month = currentDay.getMonth();
    const date = currentDay.getDate();
    const dayOfWeek = currentDay.getDay();

    // Generate realistic occupancy patterns
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timestamp = new Date(Date.UTC(year, month, date, hour - 1, minute, 0, 0)); // UTC adjustment

        // Create realistic patterns based on time and day
        let basePeople = 10;

        // Weekend pattern (lower occupancy)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          basePeople = 5;
        }

        // Peak hours (10-14 and 18-20)
        if ((hour >= 10 && hour <= 14) || (hour >= 18 && hour <= 20)) {
          basePeople *= 3;
        }

        // Add some randomness but keep it realistic
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const peopleCount = Math.round(basePeople * randomFactor);

        dataToInsert.push([peopleCount, timestamp.toISOString()]);
      }
    }
  }

  try {
    console.log(`Inserting ${dataToInsert.length} data points...`);

    // Insert in batches to avoid query size limits
    const batchSize = 1000;
    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      const values = batch.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(", ");
      const flattenedData = batch.flat();

      await db.query(`INSERT INTO occupancy_log (people_count, timestamp) VALUES ${values}`, flattenedData);

      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dataToInsert.length / batchSize)}`);
    }

    console.log("Database has been filled with sample data for the last 60 days.");

    // Verify the data
    const result = await db.query(`
            SELECT 
                DATE(timestamp AT TIME ZONE 'Europe/Prague') as date,
                COUNT(*) as records,
                AVG(people_count) as avg_people
            FROM occupancy_log 
            GROUP BY DATE(timestamp AT TIME ZONE 'Europe/Prague')
            ORDER BY date DESC
            LIMIT 10
        `);

    console.log("Sample of inserted data:");
    result.rows.forEach((row) => {
      console.log(`${row.date}: ${row.records} records, avg ${parseFloat(row.avg_people).toFixed(1)} people`);
    });
  } catch (error) {
    console.error("Failed to insert data:", error.message);
  } finally {
    process.exit(0);
  }
}

fillDatabase();

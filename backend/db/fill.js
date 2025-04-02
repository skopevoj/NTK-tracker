const db = require('./client');

async function fillDatabase() {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    console.log("Filling database with realistic and random data for the last week...");

    const dataToInsert = [];

    for (let day = 0; day < 7; day++) {
        const currentDay = new Date(oneWeekAgo);
        currentDay.setDate(oneWeekAgo.getDate() + day);

        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 10) {
                const timestamp = new Date(currentDay);
                timestamp.setHours(hour, minute, 0, 0);

                let peopleCount = 0;

                if (hour >= 6 && hour < 12) {
                    const progress = (hour - 6) * 60 + minute;
                    const base = 100 + Math.sin((progress / 360) * Math.PI) * 200;
                    peopleCount = Math.round(base + Math.random() * 20 - 10);
                } else if (hour >= 12 && hour < 18) {
                    peopleCount = Math.round(150 + Math.random() * 100 - 50);
                } else if (hour >= 18 && hour < 24) {
                    const progress = (hour - 18) * 60 + minute;
                    const base = 150 - Math.sin((progress / 360) * Math.PI) * 150;
                    peopleCount = Math.round(base + Math.random() * 20 - 10);
                } else {
                    peopleCount = Math.round(Math.random() * 5);
                }
                peopleCount = Math.max(0, Math.round(peopleCount)); // Ensure non-negative and rounded

                dataToInsert.push([peopleCount, timestamp]);
            }
        }
    }

    try {
        const values = dataToInsert
            .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
            .join(", ");
        const flattenedData = dataToInsert.flat();
        await db.query(
            `INSERT INTO occupancy_log (people_count, timestamp) VALUES ${values}`,
            flattenedData
        );
        console.log("Database has been filled with realistic and random data for the last week.");
    } catch (error) {
        console.error("Failed to insert data:", error.message);
    } finally {
        process.exit(0);
    }
}

fillDatabase();
const db = require('./client');

const START_HOUR = 0;
const END_HOUR = 24;
async function fillDatabase() {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    console.log("Filling database with constant data for the last week between 09:00 and 11:00 (UTC).");
    
    const dataToInsert = [];
    
    for (let day = 0; day < 7; day++) {
        let index=0;
        const currentDay = new Date(oneWeekAgo);
        currentDay.setDate(oneWeekAgo.getDate() + day);
        console.log(`Current day: ${currentDay.toISOString().slice(0, 10)}`);

        const year = currentDay.getFullYear();
        const month = currentDay.getMonth();
        const date = currentDay.getDate();

        for (let hour = START_HOUR; hour < END_HOUR; hour++) {
            for (let minute = 0; minute < 60; minute += 5) {
                const timestamp = new Date(Date.UTC(year, month, date, hour, minute, 0, 0));
                // const peopleCount = 50;
                index++;
                dataToInsert.push([index, timestamp.toISOString()]);
                console.log(`People count: ${index}, Time: ${timestamp.toISOString().slice(11, 16)}`);
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
        console.log("Database has been filled with constant data for the last week between 09:00 and 11:00 (UTC).");
    } catch (error) {
        console.error("Failed to insert data:", error.message);
    } finally {
        process.exit(0);
    }
}

fillDatabase();
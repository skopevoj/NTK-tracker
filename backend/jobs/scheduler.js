var cron = require('node-cron');
const scrapeLibraryOccupancy = require('../scrape/scrapeNTK');
const { insertOccupancy } = require('../db/occupancy');

// cron.schedule('*/5 * * * *', async () => {  
//     const occupancy = await scrapeLibraryOccupancy();
//     console.log("Started fetching");
//     if (occupancy !== null) {
//         await insertOccupancy(occupancy);
//     }
//     console.log(`Fetched occupancy: ${occupancy}`);
// });
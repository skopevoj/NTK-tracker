const scrapeLibraryOccupancy = require('./scrape/scrapeNTK');

(async () => {
    const occupancy = 500; //await scrapeLibraryOccupancy();
    console.log(`Library occupancy fetched: ${occupancy}`);
})();
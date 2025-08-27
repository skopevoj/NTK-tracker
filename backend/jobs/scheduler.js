var cron = require("node-cron");
const scrapeLibraryOccupancy = require("../scrape/scrapeNTK");
const { insertScrapedOccupancy } = require("../db/occupancy");

cron.schedule("*/5 * * * *", async () => {
  console.log(`[SCRAPER] Starting scrape at ${new Date().toISOString()}`);
  const startTime = Date.now();

  try {
    const occupancy = await scrapeLibraryOccupancy();

    if (occupancy !== null && typeof occupancy === "number") {
      await insertScrapedOccupancy(occupancy);
      console.log(
        `[SCRAPER] ✓ Successfully scraped and inserted occupancy: ${occupancy} people in ${Date.now() - startTime}ms`
      );
    } else {
      console.log(`[SCRAPER] ✗ Failed to scrape valid occupancy data in ${Date.now() - startTime}ms`);
    }
  } catch (error) {
    console.error(`[SCRAPER] ✗ Scraper error after ${Date.now() - startTime}ms:`, error.message);
  }
});

console.log("[SCRAPER] Scheduler initialized - scraping every 5 minutes");

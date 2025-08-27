const axios = require("axios");
const cheerio = require("cheerio");

const LIBRARY_URL = "https://www.techlib.cz/cs/";

//Function that fetches the number of people inside the library
async function scrapeLibraryOccupancy() {
  const startTime = Date.now();

  try {
    console.log(`[SCRAPE] Fetching data from ${LIBRARY_URL}`);

    const { data: html } = await axios.get(LIBRARY_URL, {
      timeout: 10000, // 10 second timeout
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);
    const spanText = $("div.panel-body.text-center.lead span").first().text().trim();

    console.log(`[SCRAPE] Found span text: "${spanText}"`);

    const occupancy = parseInt(spanText, 10);

    if (isNaN(occupancy) || occupancy < 0) {
      console.error(`[SCRAPE] ✗ Could not parse occupancy count from: "${spanText}" in ${Date.now() - startTime}ms`);
      return null;
    } else {
      console.log(`[SCRAPE] ✓ Current NTK occupancy: ${occupancy} people (scraped in ${Date.now() - startTime}ms)`);
      return occupancy;
    }
  } catch (err) {
    console.error(`[SCRAPE] ✗ Failed to fetch NTK data in ${Date.now() - startTime}ms:`, err.message);
    return null;
  }
}

module.exports = scrapeLibraryOccupancy;

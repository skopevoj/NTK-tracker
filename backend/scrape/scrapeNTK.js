const axios = require("axios");
const cheerio = require("cheerio");
// const path = require("path");

const LIBRARY_URL = "https://www.techlib.cz/cs/";

//Function that fetches the number of people inside the library
async function scrapeLibraryOccupancy() {
try {
    const { data: html } = await axios.get(LIBRARY_URL);

    const $ = cheerio.load(html);

    const spanText = $('div.panel-body.text-center.lead span').first().text().trim();
    const occupancy = parseInt(spanText, 10);

    if (isNaN(occupancy)) {
        console.error("Could not parse occupancy count.");
        return null;
    } else {
        console.log(`Current NTK occupancy: ${occupancy} people`);
        return occupancy;
    }
} catch (err) {
    console.error("Failed to fetch NTK data:", err.message);
    return null;
}
}
module.exports = scrapeLibraryOccupancy;

const { Client } = require("pg");
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });


const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
try{
      client.connect();
      console.log('Succesfully connected to database.');
}
catch (error){
    console.error('Error with connecting to database, ' + error);
}

async function showDatabaseTimezone() {
    try {
        const result = await db.query(`SHOW timezone;`);
        console.log("Database Timezone:", result.rows[0].TimeZone || result.rows[0].timezone);
    } catch (error) {
        console.error("Failed to fetch database timezone:", error.message);
    }
}



module.exports = client;

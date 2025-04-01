const { Client } = require("pg");
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });


console.log(process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect();

module.exports = client;

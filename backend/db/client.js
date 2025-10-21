const { Client } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

console.log("Connecting to database..." + process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
try {
  client.connect();
  console.log("Succesfully connected to database.");
} catch (error) {
  console.error("Error with connecting to database, " + error);
}

module.exports = client;

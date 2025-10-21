const express = require("express");

require("dotenv").config();
require("./jobs/scheduler");

const app = express();

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
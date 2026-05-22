const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const pool = new Pool({
  host: "db",
  port: 5432,
  user: "cas_user",
  password: "CASCaRAtempP@ss",
  database: "cascara_db",
});

const app = express();
app.use(express.json());

// ✅ CORS setup
app.use(
  cors({
    origin: "http://localhost:8080", // Vue app
    methods: ["GET", "POST"],
  })
);

// routes
const dbRoute = require("./routes/db_connect");
app.use("/hello", dbRoute);
app.use("/db_test", dbRoute);

app.listen(4000, () => {
  console.log("API running on port 4000");
});
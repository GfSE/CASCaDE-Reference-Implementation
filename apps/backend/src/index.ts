const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const pool = new Pool({
  host: "db",
  port: 5432,
  user: "temp_user",
  password: "temp_password",
  database: "app_db",
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
const helloRoute = require("./routes/hello");
app.use("/api/hello", helloRoute);

app.listen(4000, () => {
  console.log("API running on port 4000");
});
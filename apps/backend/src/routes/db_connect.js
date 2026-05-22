const express = require("express");
const router = express.Router();

// hello world example
router.get("/hello", (req, res) => {
  res.json({
    message: "Hello from API",
  });
});

// db access example
router.get("/db-test", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows[0]);
});

module.exports = router;
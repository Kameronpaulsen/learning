const express = require('express');
const cookieParser = require('cookie-parser');
const { pgPool, redisClient } = require('./db');
const authRouter = require('./routes/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/pg-time', async (req, res) => {
  try {
    const postgresTime = await getPgTime();
    res.json({ postgresTime });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching time from PostgreSQL' });
  }
});

async function getPgTime() {
  const result = await pgPool.query('SELECT NOW()');
  return result.rows[0].now;
}

app.use(authRouter);

module.exports = { app, pgPool, redisClient };

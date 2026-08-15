const pg = require('pg');
const redis = require('redis');

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

module.exports = { pgPool, redisClient };

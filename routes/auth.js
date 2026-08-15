const crypto = require('crypto');
const bcrypt = require('bcrypt');
const express = require('express');
const { pgPool, redisClient } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await pgPool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email, passwordHash],
    );
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Error registering user' });
    }
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pgPool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    await redisClient.set(`session:${sessionId}`, String(user.id), {
      EX: 3600,
    });
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 3600 * 1000,
    });
    res.json({ message: 'Logged in' });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

async function requireAuth(req, res, next) {
  try {
    const sessionId = req.cookies.sessionId;
    const userId = sessionId && (await redisClient.get(`session:${sessionId}`));
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Unauthorized' });
  }
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.userId],
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user' });
  }
});

router.post('/logout', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    await redisClient.del(`session:${sessionId}`);
  }
  res.clearCookie('sessionId');
  res.json({ message: 'Logged out' });
});

module.exports = router;

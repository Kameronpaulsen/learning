import crypto from 'crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, pgPool, redisClient } from '../app.js';

describe('auth routes', () => {
  const createdEmails = [];

  function uniqueEmail() {
    const email = `test-${crypto.randomUUID()}@example.com`;
    createdEmails.push(email);
    return email;
  }

  beforeAll(async () => {
    await redisClient.connect();
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await pgPool.query('DELETE FROM users WHERE email = ANY($1)', [
        createdEmails,
      ]);
    }
    await redisClient.quit();
    await pgPool.end();
  });

  describe('POST /register', () => {
    it('creates a new user with a hashed password', async () => {
      const email = uniqueEmail();
      const res = await request(app)
        .post('/register')
        .send({ email, password: 'hunter22' });

      expect(res.status).toBe(201);

      const { rows } = await pgPool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [email],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].password_hash).not.toBe('hunter22');
    });

    it('rejects a duplicate email with 409', async () => {
      const email = uniqueEmail();
      await request(app)
        .post('/register')
        .send({ email, password: 'hunter22' });

      const res = await request(app)
        .post('/register')
        .send({ email, password: 'different-password' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /login', () => {
    it('logs in with correct credentials and sets a session cookie', async () => {
      const email = uniqueEmail();
      const password = 'hunter22';
      await request(app).post('/register').send({ email, password });

      const res = await request(app).post('/login').send({ email, password });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/^sessionId=/);
    });

    it('rejects an unknown email with 401', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: uniqueEmail(), password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('rejects an incorrect password with 401', async () => {
      const email = uniqueEmail();
      await request(app)
        .post('/register')
        .send({ email, password: 'correct-password' });

      const res = await request(app)
        .post('/login')
        .send({ email, password: 'wrong-password' });

      expect(res.status).toBe(401);
    });
  });

  describe('session-protected routes', () => {
    it('GET /me returns the logged-in user', async () => {
      const email = uniqueEmail();
      const password = 'hunter22';
      const agent = request.agent(app);
      await agent.post('/register').send({ email, password });
      await agent.post('/login').send({ email, password });

      const res = await agent.get('/me');

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(email);
    });

    it('GET /me returns 401 without a session cookie', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
    });

    it('GET /me returns 401 for a forged session cookie', async () => {
      const res = await request(app)
        .get('/me')
        .set('Cookie', 'sessionId=not-a-real-session');

      expect(res.status).toBe(401);
    });

    it('POST /logout invalidates the session', async () => {
      const email = uniqueEmail();
      const password = 'hunter22';
      const agent = request.agent(app);
      await agent.post('/register').send({ email, password });
      await agent.post('/login').send({ email, password });

      await agent.post('/logout');
      const res = await agent.get('/me');

      expect(res.status).toBe(401);
    });
  });
});

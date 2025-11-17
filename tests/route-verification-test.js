import request from 'supertest';
import app from '../server.js';

describe('ZulaRides Route Verification Tests', () => {
  let authToken = 'test-token'; // This would be set after authentication in real tests

  describe('Health and Basic Routes', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('OK');
      expect(res.body.service).toBe('ZulaRides API');
    });

    it('should return API info on root', async () => {
      const res = await request(app)
        .get('/')
        .expect(200);

      expect(res.body.message).toContain('ZulaRides Backend API Running');
    });
  });

  describe('Debug Routes', () => {
    it('should list all registered API routes', async () => {
      const res = await request(app)
        .get('/api/debug-routes')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.totalRoutes).toBeGreaterThan(0);
      expect(Array.isArray(res.body.routes)).toBe(true);
    });
  });

  describe('Test Routes', () => {
    it('should respond to simple test POST', async () => {
      const res = await request(app)
        .post('/api/test-rides/simple-test')
        .send({ test: 'data' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Simple test route works!');
    });

    it('should respond to simple test GET', async () => {
      const res = await request(app)
        .get('/api/test-rides/simple-get')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Simple GET route works!');
    });
  });

  describe('Route Structure', () => {
    it('should have all major route categories', async () => {
      const res = await request(app)
        .get('/api/debug-routes')
        .expect(200);

      const categories = res.body.categories;
      
      expect(categories.drivers).toBeGreaterThan(0);
      expect(categories.rides).toBeGreaterThan(0);
      expect(categories.wallets).toBeGreaterThan(0);
      expect(categories.feedback).toBeGreaterThan(0);
      expect(categories.history).toBeGreaterThan(0);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent API routes', async () => {
      const res = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });
});

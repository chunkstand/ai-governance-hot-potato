import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

/**
 * CORS Integration Tests
 * 
 * Per requirement INF-03: CORS configured to allow GitHub Pages frontend
 * These tests verify that:
 * 1. Authorized origins (chunkstand.github.io) receive CORS headers
 * 2. Unauthorized origins are blocked (no CORS headers)
 * 3. Preflight OPTIONS requests work correctly
 * 4. Various HTTP methods have proper CORS support
 */

const ALLOWED_ORIGINS = [
  'https://chunkstand.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
];

const UNAUTHORIZED_ORIGINS = [
  'https://evil.com',
  'https://malicious-site.com',
  'http://localhost:9999',
];

describe('CORS Configuration', () => {
  describe('Authorized Origins', () => {
    it('should include CORS headers for allowed origins on GET requests', async () => {
      for (const origin of ALLOWED_ORIGINS) {
        const response = await request(app)
          .get('/health')
          .set('Origin', origin);

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-methods']).toContain('GET');
      }
    });

    it('should include CORS headers for chunkstand.github.io specifically', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .set('Origin', 'https://chunkstand.github.io');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://chunkstand.github.io');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should handle POST requests from allowed origins', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Origin', 'http://localhost:3000')
        .set('Content-Type', 'application/json')
        .send({
          mode: 'demo',
          agents: [
            { name: 'TestBot', type: 'DEMO_STRICT', color: '#FF0000' }
          ]
        });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('Unauthorized Origins', () => {
    it('should not include CORS headers for unauthorized origins', async () => {
      for (const origin of UNAUTHORIZED_ORIGINS) {
        const response = await request(app)
          .get('/health')
          .set('Origin', origin);

        // Request succeeds but without CORS headers
        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });
  });

  describe('Preflight OPTIONS Requests', () => {
    it('should handle preflight OPTIONS for allowed origins', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'https://chunkstand.github.io')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://chunkstand.github.io');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should return 204 for preflight requests', async () => {
      const response = await request(app)
        .options('/api/sessions')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should include Access-Control-Max-Age header', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'https://chunkstand.github.io');

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });

  describe('HTTP Methods CORS Support', () => {
    const testOrigin = 'http://localhost:3000';

    it('should support CORS for GET requests', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', testOrigin);

      expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
    });

    it('should support CORS for POST requests', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Origin', testOrigin)
        .set('Content-Type', 'application/json')
        .send({
          mode: 'demo',
          agents: [{ name: 'Test', type: 'DEMO_STRICT', color: '#FF0000' }]
        });

      expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
    });

    it('should support CORS for DELETE requests', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({
          mode: 'demo',
          agents: [{ name: 'DeleteTest', type: 'DEMO_STRICT', color: '#FF0000' }]
        });

      const sessionId = createResponse.body.id;

      // Then try to delete it
      const response = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Origin', testOrigin);

      expect(response.headers['access-control-allow-origin']).toBe(testOrigin);
    });
  });

  describe('Credentials', () => {
    it('should not allow credentials (v1.1 requirement)', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://chunkstand.github.io');

      // Credentials should not be allowed in v1.1
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });

  describe('Multiple Origins', () => {
    it('should support multiple origins in development (comma-separated)', async () => {
      // This test verifies that multiple origins from .env are parsed correctly
      const origins = ['http://localhost:3000', 'http://localhost:3001'];
      
      for (const origin of origins) {
        const response = await request(app)
          .get('/health')
          .set('Origin', origin);

        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRoutes from '../../src/routes/health.routes.mjs';

describe('Health Endpoint Integration', () => {
  it('GET /api/health should return 200 OK', async () => {
    // Create a simple Express app just for testing this endpoint
    const app = express();
    app.use('/api/health', healthRoutes);
    
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('memory');
    expect(response.body).toHaveProperty('version');
  });
}); 
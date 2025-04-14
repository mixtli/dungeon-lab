import { describe, it, expect, vi } from 'vitest';
import { Router } from 'express';

describe('Health Router', () => {
  it('should have a health route configured', async () => {
    const healthRouter = await import('../../src/routes/health.routes.mjs');
    
    expect(healthRouter.default).toBeDefined();
    // Router is a function, so we can't use toBeInstanceOf directly
    expect(typeof healthRouter.default).toBe('function');
    expect(healthRouter.default.name).toBe('router');
  });
  
  it('should return correct health data structure', async () => {
    const healthRouter = await import('../../src/routes/health.routes.mjs');
    
    // Mock Express route handler
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;
    
    // Get the route handler directly
    const routeHandler = (healthRouter.default as any).stack[0].route.stack[0].handle;
    
    // Call the route handler directly
    routeHandler(req, res);
    
    // Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('status', 'ok');
    expect(responseData).toHaveProperty('timestamp');
    expect(responseData).toHaveProperty('uptime');
    expect(responseData).toHaveProperty('memory');
    expect(responseData).toHaveProperty('version');
  });
}); 
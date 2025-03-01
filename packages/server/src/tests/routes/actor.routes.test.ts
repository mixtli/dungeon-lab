import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// Mock the controllers
vi.mock('../../controllers/actor.controller.js', () => ({
  getAllActors: vi.fn().mockImplementation((req, res) => {
    res.json([{ id: '1', name: 'Test Actor' }]);
  }),
  getActorById: vi.fn().mockImplementation((req, res) => {
    if (req.params.id === '1') {
      res.json({ id: '1', name: 'Test Actor' });
    } else {
      res.status(404).json({ message: 'Actor not found' });
    }
  }),
  createActor: vi.fn().mockImplementation((req, res) => {
    res.status(201).json({ id: '1', ...req.body });
  }),
  updateActor: vi.fn().mockImplementation((req, res) => {
    if (req.params.id === '1') {
      res.json({ id: '1', ...req.body });
    } else {
      res.status(404).json({ message: 'Actor not found' });
    }
  }),
  deleteActor: vi.fn().mockImplementation((req, res) => {
    if (req.params.id === '1') {
      res.status(204).end();
    } else {
      res.status(404).json({ message: 'Actor not found' });
    }
  })
}));

// Mock the auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: vi.fn().mockImplementation((req, res, next) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
    } else {
      res.status(403).json({ message: 'Unauthorized' });
    }
  })
}));

// Import the actual routes (this will use the mocked controllers)
import { actorRoutes } from '../../routes/actor.routes.js';

describe('Actor Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a fresh app instance for each test
    app = express();
    app.use(express.json());
    app.use('/api/actors', actorRoutes);
    
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/actors', () => {
    it('should return all actors', async () => {
      const response = await request(app).get('/api/actors');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: '1', name: 'Test Actor' }]);
    });
  });

  describe('GET /api/actors/:id', () => {
    it('should return a single actor by ID', async () => {
      const response = await request(app).get('/api/actors/1');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '1', name: 'Test Actor' });
    });

    it('should return 404 if actor not found', async () => {
      const response = await request(app).get('/api/actors/999');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Actor not found' });
    });
  });

  describe('POST /api/actors', () => {
    it('should create a new actor', async () => {
      const actorData = { name: 'New Actor', type: 'character' };
      const response = await request(app)
        .post('/api/actors')
        .set('Authorization', 'Bearer valid-token')
        .send(actorData);
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: '1', ...actorData });
    });

    it('should return 403 if unauthorized', async () => {
      const actorData = { name: 'New Actor', type: 'character' };
      const response = await request(app)
        .post('/api/actors')
        .send(actorData);
      
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/actors/:id', () => {
    it('should update an actor', async () => {
      const actorData = { name: 'Updated Actor' };
      const response = await request(app)
        .put('/api/actors/1')
        .set('Authorization', 'Bearer valid-token')
        .send(actorData);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '1', ...actorData });
    });

    it('should return 404 if actor not found', async () => {
      const actorData = { name: 'Updated Actor' };
      const response = await request(app)
        .put('/api/actors/999')
        .set('Authorization', 'Bearer valid-token')
        .send(actorData);
      
      expect(response.status).toBe(404);
    });

    it('should return 403 if unauthorized', async () => {
      const actorData = { name: 'Updated Actor' };
      const response = await request(app)
        .put('/api/actors/1')
        .send(actorData);
      
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/actors/:id', () => {
    it('should delete an actor', async () => {
      const response = await request(app)
        .delete('/api/actors/1')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(204);
    });

    it('should return 404 if actor not found', async () => {
      const response = await request(app)
        .delete('/api/actors/999')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(404);
    });

    it('should return 403 if unauthorized', async () => {
      const response = await request(app)
        .delete('/api/actors/1');
      
      expect(response.status).toBe(403);
    });
  });
}); 
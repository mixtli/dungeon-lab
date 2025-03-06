import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// Mock the controllers
vi.mock('../../controllers/item.controller.js', () => ({
  getAllItems: vi.fn().mockImplementation((req, res) => {
    res.json([{ id: '1', name: 'Test Item' }]);
  }),
  getItemById: vi.fn().mockImplementation((req, res) => {
    if (req.params.id === '1') {
      res.json({ id: '1', name: 'Test Item' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  }),
  createItem: vi.fn().mockImplementation((req, res) => {
    res.status(201).json({ id: '1', ...req.body });
  }),
  updateItem: vi.fn().mockImplementation((req, res) => {
    if (req.params.id === '1') {
      res.json({ id: '1', ...req.body });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  }),
  deleteItem: vi.fn().mockImplementation((req, res) => {
    if (req.params.id === '1') {
      res.status(204).end();
    } else {
      res.status(404).json({ message: 'Item not found' });
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
import { itemRoutes } from '../../routes/item.routes.mjs';

describe('Item Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a fresh app instance for each test
    app = express();
    app.use(express.json());
    app.use('/api/items', itemRoutes);
    
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const response = await request(app).get('/api/items');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: '1', name: 'Test Item' }]);
    });
  });

  describe('GET /api/items/:id', () => {
    it('should return a single item by ID', async () => {
      const response = await request(app).get('/api/items/1');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '1', name: 'Test Item' });
    });

    it('should return 404 if item not found', async () => {
      const response = await request(app).get('/api/items/999');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Item not found' });
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const itemData = { name: 'New Item', type: 'weapon' };
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', 'Bearer valid-token')
        .send(itemData);
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: '1', ...itemData });
    });

    it('should return 403 if unauthorized', async () => {
      const itemData = { name: 'New Item', type: 'weapon' };
      const response = await request(app)
        .post('/api/items')
        .send(itemData);
      
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should update an item', async () => {
      const itemData = { name: 'Updated Item' };
      const response = await request(app)
        .put('/api/items/1')
        .set('Authorization', 'Bearer valid-token')
        .send(itemData);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '1', ...itemData });
    });

    it('should return 404 if item not found', async () => {
      const itemData = { name: 'Updated Item' };
      const response = await request(app)
        .put('/api/items/999')
        .set('Authorization', 'Bearer valid-token')
        .send(itemData);
      
      expect(response.status).toBe(404);
    });

    it('should return 403 if unauthorized', async () => {
      const itemData = { name: 'Updated Item' };
      const response = await request(app)
        .put('/api/items/1')
        .send(itemData);
      
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an item', async () => {
      const response = await request(app)
        .delete('/api/items/1')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(204);
    });

    it('should return 404 if item not found', async () => {
      const response = await request(app)
        .delete('/api/items/999')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(404);
    });

    it('should return 403 if unauthorized', async () => {
      const response = await request(app)
        .delete('/api/items/1');
      
      expect(response.status).toBe(403);
    });
  });
}); 
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ItemModel } from '../../models/item.model';
import itemRoutes from '../../routes/item.routes';
import mongoose from 'mongoose';
import { authenticate } from '../../middleware/auth.middleware';

// Mock the authentication middleware
vi.mock('../../middleware/auth.middleware', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = {
      id: '60d0fe4f5311236168a109ca',
      username: 'testuser',
      isAdmin: false
    };
    next();
  })
}));

// Mock the ItemModel
vi.mock('../../models/item.model', () => {
  const mockItems = [
    {
      id: '60d0fe4f5311236168a109cb',
      name: 'Test Item',
      type: 'weapon',
      img: 'test.jpg',
      description: 'Test description',
      gameSystemId: '60d0fe4f5311236168a109cc',
      data: { damage: '1d6', weight: 2 },
      createdBy: '60d0fe4f5311236168a109ca',
      updatedBy: '60d0fe4f5311236168a109ca',
      toJSON: function() { return this; }
    }
  ];

  return {
    ItemModel: {
      find: vi.fn().mockResolvedValue(mockItems),
      findById: vi.fn().mockImplementation((id) => {
        const item = mockItems.find(i => i.id === id);
        return {
          exec: vi.fn().mockResolvedValue(item)
        };
      }),
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        const item = { ...mockItems.find(i => i.id === id), ...update };
        return {
          exec: vi.fn().mockResolvedValue(item)
        };
      }),
      findByIdAndDelete: vi.fn().mockResolvedValue(true),
      prototype: {
        save: vi.fn().mockImplementation(function() {
          return Promise.resolve(this);
        }),
        deleteOne: vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 })
      },
      new: vi.fn().mockImplementation((data) => {
        return {
          ...data,
          id: '60d0fe4f5311236168a109cd',
          save: vi.fn().mockResolvedValue({
            ...data,
            id: '60d0fe4f5311236168a109cd',
            toJSON: () => ({
              ...data,
              id: '60d0fe4f5311236168a109cd'
            })
          }),
          toJSON: () => ({
            ...data,
            id: '60d0fe4f5311236168a109cd'
          })
        };
      })
    }
  };
});

describe('Item Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/items', itemRoutes);
    
    // Reset mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const res = await request(app).get('/api/items');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Test Item');
      expect(ItemModel.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/items/:id', () => {
    it('should return a single item by ID', async () => {
      const res = await request(app).get('/api/items/60d0fe4f5311236168a109cb');
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Item');
      expect(ItemModel.findById).toHaveBeenCalledWith('60d0fe4f5311236168a109cb');
    });

    it('should return 404 if item not found', async () => {
      vi.mocked(ItemModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue(null)
      }));
      
      const res = await request(app).get('/api/items/nonexistentid');
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item not found');
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const itemData = {
        name: 'New Item',
        type: 'armor',
        gameSystemId: '60d0fe4f5311236168a109cc',
        data: { ac: 16, weight: 20 }
      };
      
      const res = await request(app)
        .post('/api/items')
        .send(itemData);
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Item');
      expect(res.body.type).toBe('armor');
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('PUT /api/items/:id', () => {
    it('should update an item', async () => {
      const updateData = {
        name: 'Updated Item',
        data: { ac: 18 }
      };
      
      const res = await request(app)
        .put('/api/items/60d0fe4f5311236168a109cb')
        .send(updateData);
      
      expect(res.status).toBe(200);
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 404 if item not found', async () => {
      vi.mocked(ItemModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue(null)
      }));
      
      const res = await request(app)
        .put('/api/items/nonexistentid')
        .send({ name: 'Updated Item' });
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item not found');
    });

    it('should return 403 if user is not authorized', async () => {
      vi.mocked(ItemModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue({
          id: '60d0fe4f5311236168a109cb',
          createdBy: { toString: () => 'differentuserid' },
          toJSON: () => ({})
        })
      }));
      
      const res = await request(app)
        .put('/api/items/60d0fe4f5311236168a109cb')
        .send({ name: 'Updated Item' });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to update this item');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an item', async () => {
      const res = await request(app).delete('/api/items/60d0fe4f5311236168a109cb');
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Item removed');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 404 if item not found', async () => {
      vi.mocked(ItemModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue(null)
      }));
      
      const res = await request(app).delete('/api/items/nonexistentid');
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item not found');
    });

    it('should return 403 if user is not authorized', async () => {
      vi.mocked(ItemModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue({
          id: '60d0fe4f5311236168a109cb',
          createdBy: { toString: () => 'differentuserid' },
          toJSON: () => ({})
        })
      }));
      
      const res = await request(app).delete('/api/items/60d0fe4f5311236168a109cb');
      
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to delete this item');
    });
  });
}); 
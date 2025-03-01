import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ActorModel } from '../../models/actor.model';
import actorRoutes from '../../routes/actor.routes';
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

// Mock the ActorModel
vi.mock('../../models/actor.model', () => {
  const mockActors = [
    {
      id: '60d0fe4f5311236168a109cb',
      name: 'Test Actor',
      type: 'character',
      img: 'test.jpg',
      description: 'Test description',
      gameSystemId: '60d0fe4f5311236168a109cc',
      data: { str: 10, dex: 12 },
      createdBy: '60d0fe4f5311236168a109ca',
      updatedBy: '60d0fe4f5311236168a109ca',
      toJSON: function() { return this; }
    }
  ];

  return {
    ActorModel: {
      find: vi.fn().mockResolvedValue(mockActors),
      findById: vi.fn().mockImplementation((id) => {
        const actor = mockActors.find(a => a.id === id);
        return {
          exec: vi.fn().mockResolvedValue(actor)
        };
      }),
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        const actor = { ...mockActors.find(a => a.id === id), ...update };
        return {
          exec: vi.fn().mockResolvedValue(actor)
        };
      }),
      findByIdAndDelete: vi.fn().mockResolvedValue(true),
      prototype: {
        save: vi.fn().mockImplementation(function() {
          return Promise.resolve(this);
        })
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

describe('Actor Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/actors', actorRoutes);
    
    // Reset mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/actors', () => {
    it('should return all actors', async () => {
      const res = await request(app).get('/api/actors');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Test Actor');
      expect(ActorModel.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/actors/:id', () => {
    it('should return a single actor by ID', async () => {
      const res = await request(app).get('/api/actors/60d0fe4f5311236168a109cb');
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Actor');
      expect(ActorModel.findById).toHaveBeenCalledWith('60d0fe4f5311236168a109cb');
    });

    it('should return 404 if actor not found', async () => {
      vi.mocked(ActorModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue(null)
      }));
      
      const res = await request(app).get('/api/actors/nonexistentid');
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Actor not found');
    });
  });

  describe('POST /api/actors', () => {
    it('should create a new actor', async () => {
      const actorData = {
        name: 'New Actor',
        type: 'npc',
        gameSystemId: '60d0fe4f5311236168a109cc',
        data: { str: 14, dex: 16 }
      };
      
      const res = await request(app)
        .post('/api/actors')
        .send(actorData);
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Actor');
      expect(res.body.type).toBe('npc');
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('PUT /api/actors/:id', () => {
    it('should update an actor', async () => {
      const updateData = {
        name: 'Updated Actor',
        data: { str: 16 }
      };
      
      const res = await request(app)
        .put('/api/actors/60d0fe4f5311236168a109cb')
        .send(updateData);
      
      expect(res.status).toBe(200);
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 404 if actor not found', async () => {
      vi.mocked(ActorModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue(null)
      }));
      
      const res = await request(app)
        .put('/api/actors/nonexistentid')
        .send({ name: 'Updated Actor' });
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Actor not found');
    });

    it('should return 403 if user is not authorized', async () => {
      vi.mocked(ActorModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue({
          id: '60d0fe4f5311236168a109cb',
          createdBy: { toString: () => 'differentuserid' },
          toJSON: () => ({})
        })
      }));
      
      const res = await request(app)
        .put('/api/actors/60d0fe4f5311236168a109cb')
        .send({ name: 'Updated Actor' });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to update this actor');
    });
  });

  describe('DELETE /api/actors/:id', () => {
    it('should delete an actor', async () => {
      const res = await request(app).delete('/api/actors/60d0fe4f5311236168a109cb');
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Actor removed');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 404 if actor not found', async () => {
      vi.mocked(ActorModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue(null)
      }));
      
      const res = await request(app).delete('/api/actors/nonexistentid');
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Actor not found');
    });

    it('should return 403 if user is not authorized', async () => {
      vi.mocked(ActorModel.findById).mockImplementationOnce(() => ({
        exec: vi.fn().mockResolvedValue({
          id: '60d0fe4f5311236168a109cb',
          createdBy: { toString: () => 'differentuserid' },
          toJSON: () => ({})
        })
      }));
      
      const res = await request(app).delete('/api/actors/60d0fe4f5311236168a109cb');
      
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not authorized to delete this actor');
    });
  });
}); 
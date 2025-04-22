import { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { actorCreateSchema, actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiPut, openApiDelete } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import express from 'express';

// Initialize services and controllers
const actorService = new ActorService();
const actorController = new ActorController(actorService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundController = {
  getAllActors: actorController.getAllActors.bind(actorController),
  getActorById: actorController.getActorById.bind(actorController),
  getActors: actorController.getActors.bind(actorController),
  createActor: actorController.createActor.bind(actorController),
  updateActor: actorController.updateActor.bind(actorController),
  deleteActor: actorController.deleteActor.bind(actorController),
  uploadActorAvatar: actorController.uploadActorAvatar.bind(actorController),
  uploadActorToken: actorController.uploadActorToken.bind(actorController),
  generateActorAvatar: actorController.generateActorAvatar.bind(actorController),
  generateActorToken: actorController.generateActorToken.bind(actorController)
};

// Public routes
router.get('/', openApiGet(actorSchema, {
  description: 'Get all actors',
  parameters: [{
    name: 'type',
    in: 'query',
    required: false,
    schema: {
      type: 'string',
      enum: ['character', 'npc']
    },
    description: 'Filter actors by type'
  }]
}), boundController.getAllActors);

router.get('/:id', openApiGetOne(actorSchema, {
  description: 'Get actor by ID'
}), boundController.getActorById);

// Protected routes - require authentication
router.use(authenticate);

router.get('/campaign/:campaignId', boundController.getActors);

// For file uploads, use validateMultipartRequest with field names
router.post('/', 
  openApiPost(actorCreateSchema, {
    description: 'Create new actor'
  }), 
  validateMultipartRequest(actorCreateSchema, ['avatar', 'token']), 
  boundController.createActor
);

router.put('/:id', 
  openApiPut(actorSchema.partial(), {
    description: 'Update actor by ID'
  }), 
  validateMultipartRequest(actorSchema.partial(), ['avatar', 'token']), 
  boundController.updateActor
);

// Upload a binary avatar image
router.put('/:id/avatar', 
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '5mb'
  }),
  openApiPut(z.null(), {
    description: 'Upload raw avatar image',
    requestBody: {
      content: {
        'image/*': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        }
      }
    }
  }), 
  boundController.uploadActorAvatar
);

// Upload a binary token image
router.put('/:id/token', 
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '2mb'
  }),
  openApiPut(z.null(), {
    description: 'Upload raw token image',
    requestBody: {
      content: {
        'image/*': {
          schema: {
            type: 'string',
            format: 'binary'
          }
        }
      }
    }
  }), 
  boundController.uploadActorToken
);

// Generate avatar and token using AI
router.post('/:id/avatar/generate', 
  openApiPost(z.null(), {
    description: 'Generate actor avatar using AI'
  }),
  boundController.generateActorAvatar
);

router.post('/:id/token/generate', 
  openApiPost(z.null(), {
    description: 'Generate actor token using AI'
  }),
  boundController.generateActorToken
);

router.delete('/:id', 
  openApiDelete(z.null(), {
    description: 'Delete actor by ID'
  }), 
  boundController.deleteActor
);

// Campaign-specific routes
router.get('/campaigns/:campaignId/actors', 
  openApiGet(actorSchema, {
    description: 'Get actors for a specific campaign'
  }), 
  boundController.getActors
);

export { router as actorRoutes }; 
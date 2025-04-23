import { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { actorCreateSchema, actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPut,
  openApiPatch,
  openApiDelete
} from '../../../oapi.mjs';
import { z } from 'zod';
import express from 'express';
import { deepPartial } from '@dungeon-lab/shared/utils/deepPartial.mjs';
import { errorHandler } from '../../../middleware/error.middleware.mjs';

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
  putActor: actorController.putActor.bind(actorController),
  patchActor: actorController.patchActor.bind(actorController),
  deleteActor: actorController.deleteActor.bind(actorController),
  uploadActorAvatar: actorController.uploadActorAvatar.bind(actorController),
  uploadActorToken: actorController.uploadActorToken.bind(actorController),
  generateActorAvatar: actorController.generateActorAvatar.bind(actorController),
  generateActorToken: actorController.generateActorToken.bind(actorController),
  searchActors: actorController.searchActors.bind(actorController)
};

// Public routes
router.get(
  '/',
  openApiGet(actorSchema, {
    description: 'Search for actors based on query parameters'
  }),
  boundController.searchActors
);

router.get(
  '/:id',
  openApiGetOne(actorSchema, {
    description: 'Get an actor by ID'
  }),
  boundController.getActorById
);

// Protected routes - require authentication
router.use(authenticate);
router.use(errorHandler);

router.get('/campaign/:campaignId', boundController.getActors);

// For file uploads, use validateMultipartRequest with field names
router.post(
  '/',
  openApiPost(actorCreateSchema, {
    description: 'Create new actor'
  }),
  validateMultipartRequest(actorCreateSchema, ['avatar', 'token']),
  boundController.createActor
);

router.put(
  '/:id',
  openApiPut(actorCreateSchema, {
    description: 'Replace actor by ID (full update)'
  }),
  validateMultipartRequest(actorCreateSchema, ['avatar', 'token']),
  boundController.putActor
);

// PATCH route for partial updates
router.patch(
  '/:id',
  openApiPatch(deepPartial(actorSchema), {
    description: 'Update actor by ID (partial update)'
  }),
  validateMultipartRequest(deepPartial(actorCreateSchema), ['avatar', 'token']),
  boundController.patchActor
);

// Upload a binary avatar image
router.put(
  '/:id/avatar',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '5mb'
  }),
  openApiPut(z.string(), {
    description: 'Upload actor avatar',
    requestBody: {
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } }
      }
    }
  }),
  boundController.uploadActorAvatar
);

// Upload a binary token image
router.put(
  '/:id/token',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '2mb'
  }),
  openApiPut(z.string(), {
    description: 'Upload actor token',
    requestBody: {
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } }
      }
    }
  }),
  boundController.uploadActorToken
);

// Generate avatar and token using AI
router.post(
  '/:id/generate-avatar',
  openApiPost(z.object({}), {
    description: 'Generate actor avatar using AI'
  }),
  boundController.generateActorAvatar
);

router.post(
  '/:id/generate-token',
  openApiPost(z.object({}), {
    description: 'Generate actor token using AI'
  }),
  boundController.generateActorToken
);

router.delete(
  '/:id',
  openApiDelete(z.string(), {
    description: 'Delete actor by ID'
  }),
  boundController.deleteActor
);

// Campaign-specific routes
router.get(
  '/campaigns/:campaignId/actors',
  openApiGet(actorSchema, {
    description: 'Get actors for a specific campaign'
  }),
  boundController.getActors
);

export { router as actorRoutes };

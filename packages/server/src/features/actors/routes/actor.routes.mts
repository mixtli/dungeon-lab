import express, { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPut,
  openApiPatch,
  openApiDelete,
  toQuerySchema
} from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import {
  getActorsResponseSchema,
  getActorResponseSchema,
  createActorRequestSchema,
  createActorResponseSchema,
  putActorRequestSchema,
  putActorResponseSchema,
  patchActorRequestSchema,
  patchActorResponseSchema,
  deleteActorResponseSchema,
  uploadActorAvatarResponseSchema,
  uploadActorTokenResponseSchema,
  generateActorAvatarResponseSchema,
  generateActorTokenResponseSchema,
  getActorsByCampaignResponseSchema,
  searchActorsQuerySchema,
  searchActorsResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { createSchema } from 'zod-openapi';

/**
 * Actors routes
 */
const router = express.Router();
const actorService = new ActorService();
const actorController = new ActorController(actorService);

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

// Routes
// Get all actors
router.get(
  '/',
  openApiGet(searchActorsQuerySchema, {
    description: 'Search for actors based on query parameters',
    parameters: toQuerySchema(searchActorsQuerySchema),
    responses: {
      200: {
        description: 'Actors retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getActorsResponseSchema.openapi({
                description: 'Actors response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundController.getAllActors
);

// Search actors
router.get(
  '/search',
  openApiGet(searchActorsQuerySchema, {
    description: 'Search for actors based on query parameters',
    parameters: toQuerySchema(searchActorsQuerySchema),
    responses: {
      200: {
        description: 'Actors retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              searchActorsResponseSchema.openapi({
                description: 'Search actors response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundController.searchActors
);

// Get actors for a campaign
router.get(
  '/campaign/:campaignId',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get actors by campaign ID',
    responses: {
      200: {
        description: 'Actors retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getActorsByCampaignResponseSchema.openapi({
                description: 'Campaign actors response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundController.getActors
);

// Get actor by ID
router.get(
  '/:id',
  openApiGetOne(z.null(), {
    description: 'Get actor by ID',
    responses: {
      200: {
        description: 'Actor retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getActorResponseSchema.openapi({
                description: 'Actor response'
              })
            )
          }
        }
      },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  boundController.getActorById
);

// Create a new actor
router.post(
  '/',
  authenticate,
  openApiPost(createActorRequestSchema, {
    description: 'Create new actor',
    responses: {
      201: {
        description: 'Actor created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              createActorResponseSchema.openapi({
                description: 'Create actor response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid actor data' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(createActorRequestSchema, ['avatar', 'token']),
  boundController.createActor
);

// Update an actor (replace entirely)
router.put(
  '/:id',
  authenticate,
  openApiPut(putActorRequestSchema, {
    description: 'Replace actor (full update)',
    responses: {
      200: {
        description: 'Actor updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              putActorResponseSchema.openapi({
                description: 'Update actor response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid actor data' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(putActorRequestSchema, ['avatar', 'token']),
  boundController.putActor
);

// Partially update an actor
router.patch(
  '/:id',
  authenticate,
  openApiPatch(patchActorRequestSchema, {
    description: 'Update actor (partial update)',
    responses: {
      200: {
        description: 'Actor patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              patchActorResponseSchema.openapi({
                description: 'Patch actor response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid actor data' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(patchActorRequestSchema, ['avatar', 'token']),
  boundController.patchActor
);

// Upload an actor's avatar
router.put(
  '/:id/avatar',
  authenticate,
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  openApiPut(z.string(), {
    description: 'Upload raw actor avatar image',
    requestBody: {
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } }
      }
    },
    responses: {
      200: {
        description: 'Actor avatar uploaded successfully',
        content: {
          'application/json': {
            schema: createSchema(
              uploadActorAvatarResponseSchema.openapi({
                description: 'Upload actor avatar response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid image data' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  boundController.uploadActorAvatar
);

// Upload an actor's token
router.put(
  '/:id/token',
  authenticate,
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  openApiPut(z.string(), {
    description: 'Upload raw actor token image',
    requestBody: {
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } }
      }
    },
    responses: {
      200: {
        description: 'Actor token uploaded successfully',
        content: {
          'application/json': {
            schema: createSchema(
              uploadActorTokenResponseSchema.openapi({
                description: 'Upload actor token response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid image data' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  boundController.uploadActorToken
);

// Generate an actor's avatar using AI
router.post(
  '/:id/generate-avatar',
  authenticate,
  openApiPost(z.object({}), {
    description: 'Generate actor avatar using AI',
    responses: {
      200: {
        description: 'Actor avatar generation triggered',
        content: {
          'application/json': {
            schema: createSchema(
              generateActorAvatarResponseSchema.openapi({
                description: 'Generate actor avatar response'
              })
            )
          }
        }
      },
      500: { description: 'Failed to generate actor avatar' }
    }
  }),
  boundController.generateActorAvatar
);

// Generate an actor's token using AI
router.post(
  '/:id/generate-token',
  authenticate,
  openApiPost(z.object({}), {
    description: 'Generate actor token using AI',
    responses: {
      200: {
        description: 'Actor token generation triggered',
        content: {
          'application/json': {
            schema: createSchema(
              generateActorTokenResponseSchema.openapi({
                description: 'Generate actor token response'
              })
            )
          }
        }
      },
      500: { description: 'Failed to generate actor token' }
    }
  }),
  boundController.generateActorToken
);

// Delete an actor
router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.string(), {
    description: 'Delete actor',
    responses: {
      204: { description: 'Actor deleted successfully' },
      404: { description: 'Actor not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteActorResponseSchema.openapi({
                description: 'Delete actor response'
              })
            )
          }
        }
      }
    }
  }),
  boundController.deleteActor
);

export default router;

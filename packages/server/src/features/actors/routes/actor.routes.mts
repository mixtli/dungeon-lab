import express from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
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
  createActorRequestSchema,
  putActorRequestSchema,
  patchActorRequestSchema,
  searchActorsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { baseAPIResponseSchema } from '@dungeon-lab/shared/types/api/base.mjs';
import { createSchema } from 'zod-openapi';

/**
 * Actors routes
 */
const router = express.Router();
const actorController = new ActorController();

// Create response schemas using baseAPIResponseSchema
const getActorsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(actorSchema)
});

const getActorResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

const actorResponseSchema = baseAPIResponseSchema.extend({
  data: actorSchema.optional()
});

const deleteResponseSchema = baseAPIResponseSchema.extend({
  data: z.undefined()
});

// Routes
// Get all actors
router.get(
  '/',
  openApiGet(z.object({ type: z.string().optional() }), {
    description: 'Get all actors, optionally filtered by type',
    parameters: [
      {
        name: 'type',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter actors by type'
      }
    ],
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
  actorController.getAllActors
);

// Search actors
router.get(
  '/search',
  authenticate,
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
                description: 'Search actors response'
              })
            )
          }
        }
      },
      403: { description: 'Access denied' },
      500: { description: 'Server error' }
    }
  }),
  actorController.searchActors
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
              getActorsResponseSchema.openapi({
                description: 'Campaign actors response'
              })
            )
          }
        }
      },
      403: { description: 'Access denied' },
      500: { description: 'Server error' }
    }
  }),
  actorController.getActors
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
  actorController.getActorById
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
              actorResponseSchema.openapi({
                description: 'Create actor response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid actor data' },
      403: { description: 'Access denied' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(createActorRequestSchema, ['avatar', 'token']),
  actorController.createActor
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
              actorResponseSchema.openapi({
                description: 'Update actor response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid actor data' },
      403: { description: 'Access denied' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(putActorRequestSchema, ['avatar', 'token']),
  actorController.putActor
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
              actorResponseSchema.openapi({
                description: 'Patch actor response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid actor data' },
      403: { description: 'Access denied' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(patchActorRequestSchema, ['avatar', 'token']),
  actorController.patchActor
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
              actorResponseSchema.openapi({
                description: 'Upload actor avatar response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid image data' },
      403: { description: 'Access denied' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  actorController.uploadActorAvatar
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
              actorResponseSchema.openapi({
                description: 'Upload actor token response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid image data' },
      403: { description: 'Access denied' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  actorController.uploadActorToken
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
              actorResponseSchema.openapi({
                description: 'Generate actor avatar response'
              })
            )
          }
        }
      },
      403: { description: 'Access denied' },
      500: { description: 'Failed to generate actor avatar' }
    }
  }),
  actorController.generateActorAvatar
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
              baseAPIResponseSchema.openapi({
                description: 'Generate actor token response'
              })
            )
          }
        }
      },
      403: { description: 'Access denied' },
      500: { description: 'Failed to generate actor token' }
    }
  }),
  actorController.generateActorToken
);

// Delete an actor
router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.string(), {
    description: 'Delete actor',
    responses: {
      200: {
        description: 'Actor deleted successfully',
        content: {
          'application/json': {
            schema: createSchema(
              deleteResponseSchema.openapi({
                description: 'Delete actor response'
              })
            )
          }
        }
      },
      403: { description: 'Access denied' },
      404: { description: 'Actor not found' },
      500: { description: 'Server error' }
    }
  }),
  actorController.deleteActor
);

export default router;

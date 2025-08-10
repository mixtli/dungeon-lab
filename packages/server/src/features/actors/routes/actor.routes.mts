import express from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import {
  createActorRequestSchema,
  putActorRequestSchema,
  patchActorRequestSchema,
  searchActorsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseAPIResponseSchema } from '@dungeon-lab/shared/types/api/base.mjs';

/**
 * Actors routes
 */
const router = express.Router();
const actorController = new ActorController();
router.use(authenticate);

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
  oapi.validPath(
    createPathSchema({
      description: 'Get all actors, optionally filtered by type',
      requestParams: {
        query: searchActorsQuerySchema
      },
      responses: {
        200: {
          description: 'Actors retrieved successfully',
          content: {
            'application/json': {
              schema: getActorsResponseSchema.openapi({
                description: 'Actors response'
              })
            }
          }
        }
      }
    })
  ),
  actorController.getActors
);

// Get actor by ID
router.get(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get actor by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Actor retrieved successfully',
          content: {
            'application/json': {
              schema: getActorResponseSchema.openapi({
                description: 'Actor response'
              })
            }
          }
        }
      }
    })
  ),
  actorController.getActorById
);

// Create a new actor
router.post(
  '/',
  authenticate,
  oapi.path(
    createPathSchema({
      description: 'Create new actor',
      requestBody: {
        content: {
          'application/json': {
            schema: createActorRequestSchema.openapi({
              description: 'Create actor request'
            })
          },
          'multipart/form-data': {
            schema: createActorRequestSchema
              .extend({
                avatar: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                }),
                token: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Create actor request'
              })
          }
        }
      },
      responses: {
        201: {
          description: 'Actor created successfully',
          content: {
            'application/json': {
              schema: actorResponseSchema.openapi({
                description: 'Create actor response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(createActorRequestSchema, ['avatar', 'token']),
  actorController.createActor
);

// Update an actor (replace entirely)
router.put(
  '/:id',
  authenticate,
  oapi.path(
    createPathSchema({
      description: 'Replace actor (full update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: putActorRequestSchema.openapi({
              description: 'Update actor request'
            })
          },
          'multipart/form-data': {
            schema: putActorRequestSchema
              .extend({
                avatar: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                }),
                token: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Update actor request'
              })
          }
        }
      },
      responses: {
        200: {
          description: 'Actor updated successfully',
          content: {
            'application/json': {
              schema: actorResponseSchema.openapi({
                description: 'Update actor response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(putActorRequestSchema, ['avatar', 'token']),
  actorController.putActor
);

// Partially update an actor
router.patch(
  '/:id',
  authenticate,
  oapi.path(
    createPathSchema({
      description: 'Update actor (partial update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: patchActorRequestSchema.openapi({
              description: 'Patch actor request'
            })
          },
          'multipart/form-data': {
            schema: patchActorRequestSchema
              .extend({
                avatar: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                }),
                token: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Patch actor request'
              })
          }
        }
      },
      responses: {
        200: {
          description: 'Actor patched successfully',
          content: {
            'application/json': {
              schema: actorResponseSchema.openapi({
                description: 'Patch actor response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(patchActorRequestSchema, ['avatar', 'token']),
  actorController.patchActor
);

// TODO: Avatar upload removed - actors no longer have avatars

// Upload an actor's token
router.put(
  '/:id/token',
  authenticate,
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  oapi.path(
    createPathSchema({
      description: 'Upload raw actor token image',
      requestParams: {
        path: z.object({ id: z.string() })
      },
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
              schema: actorResponseSchema.openapi({
                description: 'Upload actor token response'
              })
            }
          }
        }
      }
    })
  ),

  actorController.uploadActorToken
);

// TODO: Avatar generation removed - actors no longer have avatars

// Generate an actor's token using AI
router.post(
  '/:id/generate-token',
  oapi.validPath(
    createPathSchema({
      description: 'Generate actor token using AI',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Actor token generation triggered',
          content: {
            'application/json': {
              schema: actorResponseSchema.openapi({
                description: 'Generate actor token response'
              })
            }
          }
        }
      }
    })
  ),
  actorController.generateActorToken
);

// Delete an actor
router.delete(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Delete actor',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Actor deleted successfully',
          content: {
            'application/json': {
              schema: deleteResponseSchema.openapi({
                description: 'Delete actor response'
              })
            }
          }
        }
      }
    })
  ),
  actorController.deleteActor
);

export default router;

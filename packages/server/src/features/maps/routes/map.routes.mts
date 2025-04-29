import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
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
import express from 'express';
import {
  createMapRequestSchema,
  putMapRequestSchema,
  patchMapRequestSchema,
  searchMapsQuerySchema,
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { createSchema } from 'zod-openapi';
import { mapSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';

// Initialize controller
const mapService = new MapService();
const mapController = new MapController(mapService);

// Create router
const router = Router();

// Apply authentication middleware to all map routes
router.use(authenticate);

// Search maps
router.get(
  '/',
  openApiGet(searchMapsQuerySchema, {
    description: 'Search for maps based on query parameters',
    parameters: toQuerySchema(searchMapsQuerySchema),
    responses: {
      200: {
        description: 'Maps retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(mapSchema) }).openapi({
                description: 'Maps response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  mapController.searchMaps
);

// Get map by ID
router.get(
  '/:id',
  openApiGetOne(z.null(), {
    description: 'Get map by ID',
    responses: {
      200: {
        description: 'Map retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: mapSchema }).openapi({
                description: 'Map response'
              })
            )
          }
        }
      },
      404: { description: 'Map not found' },
      500: { description: 'Server error' }
    }
  }),
  mapController.getMap
);

// Create new map
router.post(
  '/',
  openApiPost(createMapRequestSchema, {
    description: 'Create new map',
    responses: {
      201: {
        description: 'Map created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: mapSchema }).openapi({
                description: 'Create map response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid map data' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(createMapRequestSchema, 'image'),
  mapController.createMap
);

// Upload a binary map image
router.put(
  '/:id/image',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  openApiPut(z.string(), {
    description: 'Upload raw map image',
    requestBody: {
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } }
      }
    },
    responses: {
      200: {
        description: 'Map image uploaded successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: mapSchema }).openapi({
                description: 'Upload map image response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid image data' },
      404: { description: 'Map not found' },
      500: { description: 'Server error' }
    }
  }),
  mapController.uploadMapImage
);

// Generate map image
router.post(
  '/:id/generate-image',
  openApiPost(z.object({}), {
    description: 'Generate map image',
    responses: {
      204: {
        description: 'Map image generation triggered'
      },
      500: {
        description: 'Failed to generate map image',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.null() }).openapi({
                description: 'Generate map image response'
              })
            )
          }
        }
      }
    }
  }),
  mapController.generateMapImage
);

// Replace map (full update)
router.put(
  '/:id',
  openApiPut(putMapRequestSchema, {
    description: 'Replace map (full update)',
    responses: {
      200: {
        description: 'Map updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: mapSchema }).openapi({
                description: 'Update map response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid map data' },
      404: { description: 'Map not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(putMapRequestSchema, 'image'),
  mapController.putMap
);

// Update map (partial update)
router.patch(
  '/:id',
  openApiPatch(patchMapRequestSchema, {
    description: 'Update map (partial update)',
    responses: {
      200: {
        description: 'Map patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: mapSchema }).openapi({
                description: 'Patch map response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid map data' },
      404: { description: 'Map not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(patchMapRequestSchema, 'image'),
  mapController.patchMap
);

// Delete map
router.delete(
  '/:id',
  openApiDelete(z.null(), {
    description: 'Delete map',
    responses: {
      200: { description: 'Map deleted successfully' },
      404: { description: 'Map not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({
                description: 'Delete map response'
              })
            )
          }
        }
      }
    }
  }),
  mapController.deleteMap
);

export { router as mapRoutes };

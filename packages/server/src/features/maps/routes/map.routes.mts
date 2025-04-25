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
  openApiDelete
} from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import express from 'express';
import {
  createMapRequestSchema,
  putMapRequestSchema,
  patchMapRequestSchema,
  searchMapsQuerySchema,
  getMapsResponseSchema,
  getMapResponseSchema,
  createMapResponseSchema,
  putMapResponseSchema,
  patchMapResponseSchema,
  deleteMapResponseSchema,
  uploadMapImageResponseSchema,
  generateMapImageResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { createSchema } from 'zod-openapi';

const router = Router();
const mapService = new MapService();
const mapController = new MapController(mapService);

// Bind controller methods to maintain 'this' context
const boundController = {
  getAllMaps: mapController.getAllMaps.bind(mapController),
  getMaps: mapController.getMaps.bind(mapController),
  getMap: mapController.getMap.bind(mapController),
  createMap: mapController.createMap.bind(mapController),
  putMap: mapController.putMap.bind(mapController),
  patchMap: mapController.patchMap.bind(mapController),
  deleteMap: mapController.deleteMap.bind(mapController),
  generateMapImage: mapController.generateMapImage.bind(mapController),
  uploadMapImage: mapController.uploadMapImage.bind(mapController),
  searchMaps: mapController.searchMaps.bind(mapController)
};

// Routes
router.use(authenticate);

router.get(
  '/',
  openApiGet(searchMapsQuerySchema, {
    description: 'Search for maps based on query parameters',
    parameters: [
      {
        name: 'name',
        in: 'query',
        description: 'Name of the map',
        required: false
      }

      // searchMapsQuerySchema.openapi({ description: 'Search maps query parameters' })
    ],
    responses: {
      200: {
        description: 'Maps retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getMapsResponseSchema.openapi({
                description: 'Maps response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundController.searchMaps
);

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
              getMapResponseSchema.openapi({
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
  boundController.getMap
);

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
              createMapResponseSchema.openapi({
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
  boundController.createMap
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
              uploadMapImageResponseSchema.openapi({
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
  boundController.uploadMapImage
);

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
              generateMapImageResponseSchema.openapi({
                description: 'Generate map image response'
              })
            )
          }
        }
      }
    }
  }),
  boundController.generateMapImage
);

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
              putMapResponseSchema.openapi({
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
  boundController.putMap
);

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
              patchMapResponseSchema.openapi({
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
  boundController.patchMap
);

router.delete(
  '/:id',
  openApiDelete(z.string(), {
    description: 'Delete map',
    responses: {
      204: { description: 'Map deleted successfully' },
      404: { description: 'Map not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteMapResponseSchema.openapi({
                description: 'Delete map response'
              })
            )
          }
        }
      }
    }
  }),
  boundController.deleteMap
);

export const mapRoutes = router;

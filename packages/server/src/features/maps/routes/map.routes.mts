import { Router } from 'express';
import { MapController } from '../controllers/map.controller.mjs';
import { MapService } from '../services/map.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import express from 'express';
import {
  createMapRequestSchema,
  putMapRequestSchema,
  patchMapRequestSchema,
  searchMapsQuerySchema,
  baseAPIResponseSchema,
  deleteAPIResponseSchema,
  importUVTTRequestSchema,
  importUVTTResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { mapSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import { Request, Response, NextFunction } from 'express';

// Initialize controller
const mapService = new MapService();
const mapController = new MapController(mapService);

// Create router
const router = Router();

// Apply authentication middleware to all map routes
router.use(authenticate);

// Create response schemas using baseAPIResponseSchema
const getMapsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(mapSchema)
});

const getMapResponseSchema = baseAPIResponseSchema.extend({
  data: mapSchema
});

const mapResponseSchema = baseAPIResponseSchema.extend({
  data: mapSchema
});

const generateMapResponseSchema = baseAPIResponseSchema.extend({
  data: z.null()
});

// Search maps
router.get(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Search for maps based on query parameters',
      requestParams: {
        query: searchMapsQuerySchema
      },
      responses: {
        200: {
          description: 'Maps retrieved successfully',
          content: {
            'application/json': {
              schema: getMapsResponseSchema.openapi({
                description: 'Maps response'
              })
            }
          }
        }
      }
    })
  ),
  mapController.searchMaps
);

// Get map by ID
router.get(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get map by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Map retrieved successfully',
          content: {
            'application/json': {
              schema: getMapResponseSchema.openapi({
                description: 'Map response'
              })
            },
            'application/uvtt': {
              schema: {
                type: 'object',
                description: 'UVTT formatted map data with embedded base64 image'
              }
            }
          }
        }
      }
    })
  ),
  mapController.getMap
);

// Create new map
router.post(
  '/',
  oapi.path(
    createPathSchema({
      description: 'Create new map',
      requestBody: {
        content: {
          'application/json': {
            schema: createMapRequestSchema.openapi({
              description: 'Create map request'
            })
          },
          'multipart/form-data': {
            schema: createMapRequestSchema
              .extend({
                image: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Create map request with image'
              })
          },
          'application/uvtt': {
            schema: importUVTTRequestSchema.openapi({
              description: 'Import UVTT file'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Map created successfully',
          content: {
            'application/json': {
              schema: mapResponseSchema.openapi({
                description: 'Create map response'
              })
            }
          }
        }
      }
    })
  ),
  // Content type check middleware
  (req: Request, res: Response, next: NextFunction) => {
    if (req.is('application/uvtt')) {
      // For UVTT files, use the raw body parser middleware
      return express.raw({ 
        type: 'application/uvtt',
        limit: '50mb' 
      })(req, res, next);
    } 
    // For other content types, continue to next middleware
    next();
  },
  // Validation middleware (skipped for UVTT files which are handled by the controller)
  validateMultipartRequest(createMapRequestSchema, 'image'),
  // Controller handler that routes based on content type
  (req: Request, res: Response, _next: NextFunction) => {
    if (req.is('application/uvtt')) {
      return mapController.importUVTT(req, res);
    }
    return mapController.createMap(req, res);
  }
);

// Import UVTT file
router.post(
  '/import-uvtt',
  oapi.path(
    createPathSchema({
      description: 'Import a map from UVTT file',
      requestBody: {
        content: {
          'application/uvtt': {
            schema: importUVTTRequestSchema.openapi({
              description: 'Import UVTT request'
            })
          },
          'application/json': {
            schema: importUVTTRequestSchema.openapi({
              description: 'Import UVTT request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Map imported successfully',
          content: {
            'application/json': {
              schema: importUVTTResponseSchema.openapi({
                description: 'Import UVTT response'
              })
            }
          }
        }
      }
    })
  ),
  express.raw({ 
    type: 'application/uvtt',
    limit: '50mb' 
  }),
  mapController.importUVTT
);

// Upload a binary map image
router.put(
  '/:id/image',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  oapi.path(
    createPathSchema({
      description: 'Upload raw map image',
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
          description: 'Map image uploaded successfully',
          content: {
            'application/json': {
              schema: mapResponseSchema.openapi({
                description: 'Upload map image response'
              })
            }
          }
        }
      }
    })
  ),
  mapController.uploadMapImage
);

// Generate map image
router.post(
  '/:id/generate-image',
  oapi.validPath(
    createPathSchema({
      description: 'Generate map image',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Map image generation triggered',
          content: {
            'application/json': {
              schema: generateMapResponseSchema.openapi({
                description: 'Generate map image response'
              })
            }
          }
        }
      }
    })
  ),
  mapController.generateMapImage
);

// Replace map (full update)
router.put(
  '/:id',
  oapi.path(
    createPathSchema({
      description: 'Replace map (full update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: putMapRequestSchema.openapi({
              description: 'Update map request'
            })
          },
          'multipart/form-data': {
            schema: putMapRequestSchema
              .extend({
                image: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Update map request with image'
              })
          }
        }
      },
      responses: {
        200: {
          description: 'Map updated successfully',
          content: {
            'application/json': {
              schema: mapResponseSchema.openapi({
                description: 'Update map response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(putMapRequestSchema, 'image'),
  mapController.putMap
);

// Update map (partial update)
router.patch(
  '/:id',
  oapi.path(
    createPathSchema({
      description: 'Update map (partial update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: patchMapRequestSchema.openapi({
              description: 'Patch map request'
            })
          },
          'multipart/form-data': {
            schema: patchMapRequestSchema
              .extend({
                image: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Patch map request with image'
              })
          }
        }
      },
      responses: {
        200: {
          description: 'Map patched successfully',
          content: {
            'application/json': {
              schema: mapResponseSchema.openapi({
                description: 'Patch map response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(patchMapRequestSchema, 'image'),
  mapController.patchMap
);

// Delete map
router.delete(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Delete map',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Map deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete map response'
              })
            }
          }
        }
      }
    })
  ),
  mapController.deleteMap
);

export { router as mapRoutes };

import { Router } from 'express';
import { ItemController } from '../controllers/item.controller.mjs';
import { ItemService } from '../services/item.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { itemSchema, itemCreateSchema } from '@dungeon-lab/shared/schemas/item.schema.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import express from 'express';
import {
  searchItemsQuerySchema,
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controllers
const itemService = new ItemService();
const itemController = new ItemController(itemService);

// Create router
const router = Router();

// Create response schemas using baseAPIResponseSchema
const getItemsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(itemSchema)
});

const getItemResponseSchema = baseAPIResponseSchema.extend({
  data: itemSchema
});

// Public routes
router.get(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Search items with filters or get all items',
      requestParams: {
        query: searchItemsQuerySchema
      },
      responses: {
        200: {
          description: 'Items retrieved successfully',
          content: {
            'application/json': {
              schema: getItemsResponseSchema.openapi({
                description: 'Items response'
              })
            }
          }
        }
      }
    })
  ),
  itemController.searchItems
);

router.get(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get item by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Item retrieved successfully',
          content: {
            'application/json': {
              schema: getItemResponseSchema.openapi({
                description: 'Item response'
              })
            }
          }
        }
      }
    })
  ),
  itemController.getItemById
);

// Protected routes
router.post(
  '/',
  authenticate,
  oapi.path(
    createPathSchema({
      description: 'Create new item',
      requestBody: {
        content: {
          'application/json': {
            schema: itemCreateSchema.openapi({
              description: 'Create item request'
            })
          },
          'multipart/form-data': {
            schema: itemCreateSchema
              .extend({
                image: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Create item request with image'
              })
          }
        }
      },
      responses: {
        201: {
          description: 'Item created successfully',
          content: {
            'application/json': {
              schema: getItemResponseSchema.openapi({
                description: 'Create item response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(itemCreateSchema, ['image']),
  itemController.createItem
);

// Upload a binary item image
router.put(
  '/:id/image',
  authenticate,
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  oapi.path(
    createPathSchema({
      description: 'Upload raw item image',
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
          description: 'Item image uploaded successfully',
          content: {
            'application/json': {
              schema: getItemResponseSchema.openapi({
                description: 'Upload item image response'
              })
            }
          }
        }
      }
    })
  ),
  itemController.uploadItemImage
);

router.put(
  '/:id',
  authenticate,
  oapi.path(
    createPathSchema({
      description: 'Replace item by ID (full update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: itemCreateSchema.openapi({
              description: 'Update item request'
            })
          },
          'multipart/form-data': {
            schema: itemCreateSchema
              .extend({
                image: z.instanceof(File).openapi({
                  type: 'string',
                  format: 'binary'
                })
              })
              .openapi({
                description: 'Update item request with image'
              })
          }
        }
      },
      responses: {
        200: {
          description: 'Item updated successfully',
          content: {
            'application/json': {
              schema: getItemResponseSchema.openapi({
                description: 'Update item response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(itemCreateSchema, 'image'),
  itemController.putItem
);

router.patch(
  '/:id',
  authenticate,
  oapi.path(
    createPathSchema({
      description: 'Update item by ID (partial update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: itemSchema.deepPartial().openapi({
              description: 'Patch item request'
            })
          },
          'multipart/form-data': {
            schema: itemSchema
              .deepPartial()
              .extend({
                image: z.instanceof(File).openapi({ type: 'string', format: 'binary' })
              })
              .openapi({
                description: 'Patch item request with image'
              })
          }
        }
      },
      responses: {
        200: {
          description: 'Item patched successfully',
          content: {
            'application/json': {
              schema: getItemResponseSchema.openapi({
                description: 'Patch item response'
              })
            }
          }
        }
      }
    })
  ),
  validateMultipartRequest(itemSchema.deepPartial(), 'image'),
  itemController.patchItem
);

router.delete(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Delete item by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Item deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete item response'
              })
            }
          }
        }
      }
    })
  ),
  itemController.deleteItem
);

// Campaign-specific routes
router.get(
  '/campaigns/:campaignId/items',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get items for a specific campaign',
      requestParams: {
        path: z.object({ campaignId: z.string() })
      },
      responses: {
        200: {
          description: 'Campaign items retrieved successfully',
          content: {
            'application/json': {
              schema: getItemsResponseSchema.openapi({
                description: 'Campaign items response'
              })
            }
          }
        }
      }
    })
  ),
  itemController.getItems
);

export { router as itemRoutes };

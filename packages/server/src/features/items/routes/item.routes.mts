import { Router } from 'express';
import { ItemController } from '../controllers/item.controller.mjs';
import { ItemService } from '../services/item.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { itemSchema, itemCreateSchema } from '@dungeon-lab/shared/schemas/item.schema.mjs';
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
import { deepPartial } from '@dungeon-lab/shared/utils/deepPartial.mjs';
import express from 'express';
import {
  searchItemsQuerySchema,
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { createSchema } from 'zod-openapi';

// Initialize services and controllers
const itemService = new ItemService();
const itemController = new ItemController(itemService);

// Create router
const router = Router();

// Public routes
router.get(
  '/',
  openApiGet(searchItemsQuerySchema, {
    description: 'Search items with filters or get all items',
    parameters: toQuerySchema(searchItemsQuerySchema),
    responses: {
      200: {
        description: 'Items retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(itemSchema) }).openapi({
                description: 'Items response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  itemController.searchItems
);

router.get(
  '/:id',
  openApiGetOne(z.null(), {
    description: 'Get item by ID',
    responses: {
      200: {
        description: 'Item retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: itemSchema }).openapi({
                description: 'Item response'
              })
            )
          }
        }
      },
      404: { description: 'Item not found' },
      500: { description: 'Server error' }
    }
  }),
  itemController.getItemById
);

// Protected routes
router.post(
  '/',
  authenticate,
  openApiPost(itemCreateSchema, {
    description: 'Create new item',
    responses: {
      201: {
        description: 'Item created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: itemSchema }).openapi({
                description: 'Create item response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid item data' },
      500: { description: 'Server error' }
    }
  }),
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
  openApiPut(z.string(), {
    description: 'Upload raw item image',
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
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: itemSchema }).openapi({
                description: 'Upload item image response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid image data' },
      403: { description: 'Access denied' },
      404: { description: 'Item not found' },
      500: { description: 'Server error' }
    }
  }),
  itemController.uploadItemImage
);

router.put(
  '/:id',
  authenticate,
  openApiPut(itemCreateSchema, {
    description: 'Replace item by ID (full update)',
    responses: {
      200: {
        description: 'Item updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: itemSchema }).openapi({
                description: 'Update item response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid item data' },
      403: { description: 'Access denied' },
      404: { description: 'Item not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(itemCreateSchema, 'image'),
  itemController.putItem
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(deepPartial(itemSchema), {
    description: 'Update item by ID (partial update)',
    responses: {
      200: {
        description: 'Item patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: itemSchema }).openapi({
                description: 'Patch item response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid item data' },
      403: { description: 'Access denied' },
      404: { description: 'Item not found' },
      500: { description: 'Server error' }
    }
  }),
  validateMultipartRequest(deepPartial(itemSchema), 'image'),
  itemController.patchItem
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.null(), {
    description: 'Delete item by ID',
    responses: {
      200: { description: 'Item deleted successfully' },
      403: { description: 'Access denied' },
      404: { description: 'Item not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({
                description: 'Delete item response'
              })
            )
          }
        }
      }
    }
  }),
  itemController.deleteItem
);

// Campaign-specific routes
router.get(
  '/campaigns/:campaignId/items',
  authenticate,
  openApiGet(z.null(), {
    description: 'Get items for a specific campaign',
    responses: {
      200: {
        description: 'Campaign items retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(itemSchema) }).openapi({
                description: 'Campaign items response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  itemController.getItems
);

export { router as itemRoutes };

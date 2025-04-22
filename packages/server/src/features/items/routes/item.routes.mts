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
  openApiDelete
} from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import { deepPartial } from '@dungeon-lab/shared/utils/deepPartial.mjs';
import express from 'express';

// Initialize services and controllers
const itemService = new ItemService();
const itemController = new ItemController(itemService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundSearchItems = itemController.searchItems.bind(itemController);
const boundGetItemById = itemController.getItemById.bind(itemController);
const boundGetItems = itemController.getItems.bind(itemController);
const boundCreateItem = itemController.createItem.bind(itemController);
const boundPutItem = itemController.putItem.bind(itemController);
const boundPatchItem = itemController.patchItem.bind(itemController);
const boundDeleteItem = itemController.deleteItem.bind(itemController);
const boundUploadItemImage = itemController.uploadItemImage.bind(itemController);

// Public routes
router.get(
  '/',
  openApiGet(itemSchema, {
    description: 'Search items with filters or get all items',
    parameters: [
      {
        name: 'name',
        in: 'query',
        description: 'Filter by item name (case-insensitive)',
        schema: { type: 'string' }
      },
      {
        name: 'type',
        in: 'query',
        description: 'Filter by item type',
        schema: { type: 'string' }
      },
      {
        name: 'pluginId',
        in: 'query',
        description: 'Filter by game system plugin ID',
        schema: { type: 'string' }
      }
    ]
  }),
  boundSearchItems
);

router.get(
  '/:id',
  openApiGetOne(itemSchema, {
    description: 'Get item by ID'
  }),
  boundGetItemById
);

// Protected routes
router.post(
  '/',
  authenticate,
  openApiPost(itemCreateSchema, {
    description: 'Create new item'
  }),
  validateMultipartRequest(itemCreateSchema, ['image']),
  boundCreateItem
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
    }
  }),
  boundUploadItemImage
);

router.put(
  '/:id',
  authenticate,
  openApiPut(itemCreateSchema, {
    description: 'Replace item by ID (full update)'
  }),
  validateMultipartRequest(itemCreateSchema, 'image'),
  boundPutItem
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(deepPartial(itemSchema), {
    description: 'Update item by ID (partial update)'
  }),
  validateMultipartRequest(deepPartial(itemSchema), 'image'),
  boundPatchItem
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.string(), {
    description: 'Delete item by ID'
  }),
  boundDeleteItem
);

// Campaign-specific routes
router.get(
  '/campaigns/:campaignId/items',
  authenticate,
  openApiGet(itemSchema, {
    description: 'Get items for a specific campaign'
  }),
  boundGetItems
);

export { router as itemRoutes };

import { Router } from 'express';
import { ItemController } from '../controllers/item.controller.mjs';
import { ItemService } from '../services/item.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { itemSchema } from '@dungeon-lab/shared/schemas/item.schema.mjs';
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

// Initialize services and controllers
const itemService = new ItemService();
const itemController = new ItemController(itemService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundGetAllItems = itemController.getAllItems.bind(itemController);
const boundGetItemById = itemController.getItemById.bind(itemController);
const boundGetItems = itemController.getItems.bind(itemController);
const boundCreateItem = itemController.createItem.bind(itemController);
const boundPutItem = itemController.putItem.bind(itemController);
const boundPatchItem = itemController.patchItem.bind(itemController);
const boundDeleteItem = itemController.deleteItem.bind(itemController);

// Public routes
router.get(
  '/',
  openApiGet(itemSchema, {
    description: 'Get all items'
  }),
  boundGetAllItems
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
  openApiPost(itemSchema, {
    description: 'Create new item'
  }),
  validateRequest(itemSchema),
  boundCreateItem
);

router.put(
  '/:id',
  authenticate,
  openApiPut(itemSchema, {
    description: 'Replace item by ID (full update)'
  }),
  validateRequest(itemSchema),
  boundPutItem
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(deepPartial(itemSchema), {
    description: 'Update item by ID (partial update)'
  }),
  validateRequest(deepPartial(itemSchema)),
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

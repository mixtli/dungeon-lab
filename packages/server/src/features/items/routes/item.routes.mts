import { Router } from 'express';
import { ItemController } from '../controllers/item.controller.mjs';
import { ItemService } from '../services/item.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { itemSchema } from '@dungeon-lab/shared/schemas/item.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiPut, openApiDelete } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
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
const boundUpdateItem = itemController.updateItem.bind(itemController);
const boundDeleteItem = itemController.deleteItem.bind(itemController);

// Public routes
router.get('/', openApiGet(itemSchema, {
  description: 'Get all items'
}), boundGetAllItems);

router.get('/:id', openApiGetOne(itemSchema, {
  description: 'Get item by ID'
}), boundGetItemById);

// Protected routes
router.post('/', authenticate, openApiPost(itemSchema, {
  description: 'Create new item'
}), validateRequest(itemSchema), boundCreateItem);

router.put('/:id', authenticate, openApiPut(itemSchema.partial(), {
  description: 'Update item by ID'
}), validateRequest(itemSchema.partial()), boundUpdateItem);

router.delete('/:id', authenticate, openApiDelete(z.null(), {
  description: 'Delete item by ID'
}), boundDeleteItem);

// Campaign-specific routes
router.get('/campaigns/:campaignId/items', authenticate, openApiGet(itemSchema, {
  description: 'Get items for a specific campaign'
}), boundGetItems);

export { router as itemRoutes }; 
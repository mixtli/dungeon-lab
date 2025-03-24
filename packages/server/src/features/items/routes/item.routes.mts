import { Router } from 'express';
import { ItemController } from '../controllers/item.controller.mjs';
import { ItemService } from '../services/item.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { itemCreateSchema, itemUpdateSchema } from '@dungeon-lab/shared/schemas/item.schema.mjs';

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
router.get('/', boundGetAllItems);
router.get('/:id', boundGetItemById);

// Protected routes
router.post('/', authenticate, validateRequest(itemCreateSchema), boundCreateItem);
router.put('/:id', authenticate, validateRequest(itemUpdateSchema), boundUpdateItem);
router.delete('/:id', authenticate, boundDeleteItem);

// Campaign-specific routes
router.get('/campaigns/:campaignId/items', authenticate, boundGetItems);

export { router as itemRoutes }; 
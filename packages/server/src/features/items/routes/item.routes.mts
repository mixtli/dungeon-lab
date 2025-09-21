import { Router } from 'express';
import { ItemController } from '../controllers/item.controller.mjs';
import { ItemService } from '../services/item.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import express from 'express';

// Initialize services and controllers
const itemService = new ItemService();
const itemController = new ItemController(itemService);

// Create router
const router = Router();

// Public routes
router.get('/', itemController.searchItems);

router.get('/:id', itemController.getItemById);

// Protected routes
router.post('/', authenticate, itemController.createItem);

// Upload a binary item image
router.put(
  '/:id/image',
  authenticate,
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  itemController.uploadItemImage
);

router.put('/:id', authenticate, itemController.putItem);

router.patch('/:id', authenticate, itemController.patchItem);

router.delete('/:id', authenticate, itemController.deleteItem);

// Campaign-specific routes
router.get('/campaigns/:campaignId/items', authenticate, itemController.getItems);

export { router as itemRoutes };
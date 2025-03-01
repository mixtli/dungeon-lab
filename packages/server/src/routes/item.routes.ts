import { Router } from 'express';
import * as itemController from '../controllers/item.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);

// Protected routes
router.post('/', authenticate, itemController.createItem);
router.put('/:id', authenticate, itemController.updateItem);
router.delete('/:id', authenticate, itemController.deleteItem);

export default router; 
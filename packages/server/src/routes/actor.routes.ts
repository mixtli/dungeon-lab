import { Router } from 'express';
import * as actorController from '../controllers/actor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/', actorController.getAllActors);
router.get('/:id', actorController.getActorById);

// Protected routes
router.post('/', authenticate, actorController.createActor);
router.put('/:id', authenticate, actorController.updateActor);
router.delete('/:id', authenticate, actorController.deleteActor);

export const actorRoutes = router; 
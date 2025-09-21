import express from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';

/**
 * Actors routes
 */
const router = express.Router();
const actorController = new ActorController();
router.use(authenticate);

// Routes
// Get all actors
router.get('/', actorController.getActors);

// Get actor by ID
router.get('/:id', actorController.getActorById);

// Create a new actor
router.post('/', actorController.createActor);

// Update an actor (replace entirely)
router.put('/:id', actorController.putActor);

// Partially update an actor
router.patch('/:id', actorController.patchActor);

// Upload an actor's token
router.put(
  '/:id/token',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '10mb'
  }),
  actorController.uploadActorToken
);

// Generate an actor's token using AI
router.post('/:id/generate-token', actorController.generateActorToken);

// Delete an actor
router.delete('/:id', actorController.deleteActor);

export default router;
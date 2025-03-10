import { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { actorCreateSchema, actorUpdateSchema } from '@dungeon-lab/shared/src/schemas/actor.schema.mjs';

// Initialize services and controllers
const actorService = new ActorService();
const actorController = new ActorController(actorService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundGetAllActors = actorController.getAllActors.bind(actorController);
const boundGetActorById = actorController.getActorById.bind(actorController);
const boundGetActors = actorController.getActors.bind(actorController);
const boundCreateActor = actorController.createActor.bind(actorController);
const boundUpdateActor = actorController.updateActor.bind(actorController);
const boundDeleteActor = actorController.deleteActor.bind(actorController);

// Public routes
router.get('/', boundGetAllActors);
router.get('/:id', boundGetActorById);

// Protected routes
router.post('/', authenticate, validateRequest(actorCreateSchema), boundCreateActor);
router.put('/:id', authenticate, validateRequest(actorUpdateSchema), boundUpdateActor);
router.delete('/:id', authenticate, boundDeleteActor);

// Campaign-specific routes
router.get('/campaigns/:campaignId/actors', authenticate, boundGetActors);

export { router as actorRoutes }; 
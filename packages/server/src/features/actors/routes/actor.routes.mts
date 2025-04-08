import { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { actorCreateSchema, actorUpdateSchema, actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiPut, openApiDelete } from '../../../oapi.mjs';
import { z } from '@dungeon-lab/shared/src/lib/zod.mjs';

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
router.get('/', openApiGet(actorSchema, {
  description: 'Get all actors'
}), boundGetAllActors);

router.get('/:id', openApiGetOne(actorSchema, {
  description: 'Get actor by ID'
}), boundGetActorById);

// Protected routes
router.get('/campaign/:campaignId', authenticate, boundGetActors);

// For file uploads, use validateMultipartRequest with field names

router.post('/', authenticate, openApiPost(actorCreateSchema, {
  description: 'Create new actor'
}), validateMultipartRequest(actorCreateSchema, ['avatar', 'token']), boundCreateActor);

router.put('/:id', authenticate, openApiPut(actorUpdateSchema, {
  description: 'Update actor by ID'
}), validateMultipartRequest(actorUpdateSchema, ['avatar', 'token']), boundUpdateActor);

router.delete('/:id', authenticate, openApiDelete(z.object({}), {
  description: 'Delete actor by ID'
}), boundDeleteActor);

// Campaign-specific routes
router.get('/campaigns/:campaignId/actors', authenticate, openApiGet(actorSchema, {
  description: 'Get actors for a specific campaign'
}), boundGetActors);


export { router as actorRoutes }; 
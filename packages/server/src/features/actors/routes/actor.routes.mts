import { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';
import { actorCreateSchema, actorUpdateSchema, actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiPut, openApiDelete } from '../../../oapi.mjs';
import { z } from '@dungeon-lab/shared/src/lib/zod.mjs';
import { generateCharacterToken, generateCharacterAvatar } from '../utils/actor-image-generator.mjs';
import { ActorModel } from '../models/actor.model.mjs';
import asyncHandler from 'express-async-handler';

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

// Generate new image for an actor using AI
router.post('/:id/generate-images/:type', asyncHandler(async (req, res) => {
  const actorId = req.params.id;
  const imageType = req.params.type as 'avatar' | 'token';
  
  // Find the actor
  const actor = await ActorModel.findById(actorId);
  if (!actor) {
    res.status(404).json({ message: 'Actor not found' });
    return;
  }

  // Generate the requested image type
  const result = imageType === 'avatar' 
    ? await generateCharacterAvatar(actor)
    : await generateCharacterToken(actor);

  // Update the actor with new image
  const update = imageType === 'avatar' 
    ? { avatar: result }
    : { token: result };

  await ActorModel.findByIdAndUpdate(actorId, {
    ...update,
    updatedBy: req.session.user.id
  });

  // Return the new image data
  res.json(result);
}));

export { router as actorRoutes }; 
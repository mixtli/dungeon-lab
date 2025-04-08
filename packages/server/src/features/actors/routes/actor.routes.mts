import { Router } from 'express';
import { ActorController } from '../controllers/actor.controller.mjs';
import { ActorService } from '../services/actor.service.mjs';
import { uploadActorImage } from '../controllers/actor-image.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { actorCreateSchema, actorUpdateSchema, actorSchema } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import { openApiGet, openApiGetOne, openApiPost, openApiPut, openApiDelete } from '../../../oapi.mjs';
import { z } from '@dungeon-lab/shared/src/lib/zod.mjs';
import { validateMultipartRequest } from '../../../middleware/validation.middleware.mjs';

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
router.post('/', authenticate, openApiPost(actorCreateSchema, {
  description: 'Create new actor'
}), validateRequest(actorCreateSchema), boundCreateActor);

router.put('/:id', authenticate, openApiPut(actorUpdateSchema, {
  description: 'Update actor by ID'
}), validateRequest(actorUpdateSchema), boundUpdateActor);

router.delete('/:id', authenticate, openApiDelete(actorSchema, {
  description: 'Delete actor by ID'
}), boundDeleteActor);

// Campaign-specific routes
router.get('/campaigns/:campaignId/actors', authenticate, openApiGet(actorSchema, {
  description: 'Get actors for a specific campaign'
}), boundGetActors);

// Image upload route
router.post(
  '/images/:type', 
  authenticate, 
  openApiPost(z.object({ 
    image: z.custom((val) => true), // Just a placeholder for OpenAPI docs
    actorId: z.string().optional()
  }), {
    description: 'Upload actor image (avatar or token)',
    responses: {
      200: {
        description: 'Image uploaded successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                objectKey: { type: 'string' },
                size: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }),
  validateMultipartRequest(z.object({}), 'image'), // Use empty schema since we're validating in the controller
  uploadActorImage
);

export { router as actorRoutes }; 
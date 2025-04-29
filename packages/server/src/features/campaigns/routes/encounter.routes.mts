import { Router } from 'express';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { z } from '../../../utils/zod.mjs';
import { createSchema } from 'zod-openapi';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPatch,
  openApiDelete,
  toQuerySchema
} from '../../../oapi.mjs';
import {
  encounterSchema,
  encounterCreateSchema,
  encounterPatchSchema
} from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
import {
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controller
const encounterService = new EncounterService();
const encounterController = new EncounterController(encounterService);

// Create router
const router = Router();

// Define routes
router.get(
  '/',
  authenticate,
  openApiGet(z.object({ campaignId: z.string().optional() }), {
    description: 'Get all encounters, optionally filtered by campaignId',
    parameters: toQuerySchema(z.object({ campaignId: z.string().optional() })),
    responses: {
      200: {
        description: 'Encounters retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.array(encounterSchema)
                })
                .openapi({
                  description: 'Encounters response'
                })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  encounterController.getEncounters
);

router.get(
  '/:id',
  authenticate,
  openApiGetOne(z.object({ campaignId: z.string().optional() }), {
    description: 'Get encounter by ID',
    parameters: toQuerySchema(z.object({ campaignId: z.string().optional() })),
    responses: {
      200: {
        description: 'Encounter retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: encounterSchema
                })
                .openapi({
                  description: 'Encounter response'
                })
            )
          }
        }
      },
      400: { description: 'Bad request - Campaign ID required' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Encounter not found' },
      500: { description: 'Server error' }
    }
  }),
  encounterController.getEncounter
);

router.post(
  '/',
  authenticate,
  openApiPost(encounterCreateSchema, {
    description: 'Create a new encounter',
    responses: {
      201: {
        description: 'Encounter created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: encounterSchema
                })
                .openapi({
                  description: 'Create encounter response'
                })
            )
          }
        }
      },
      400: { description: 'Invalid encounter data or missing campaign ID' },
      403: { description: 'Only the game master can create encounters' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(encounterCreateSchema),
  encounterController.createEncounter
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(encounterPatchSchema, {
    description: 'Update an encounter by ID (partial update)',
    responses: {
      200: {
        description: 'Encounter patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: encounterSchema
                })
                .openapi({
                  description: 'Patch encounter response'
                })
            )
          }
        }
      },
      400: { description: 'Invalid encounter data' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Encounter not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(encounterPatchSchema),
  encounterController.updateEncounter
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.null(), {
    description: 'Delete an encounter by ID',
    responses: {
      204: { description: 'Encounter deleted successfully' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Encounter not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({
                description: 'Delete encounter response'
              })
            )
          }
        }
      }
    }
  }),
  encounterController.deleteEncounter
);

export const encounterRoutes = router;

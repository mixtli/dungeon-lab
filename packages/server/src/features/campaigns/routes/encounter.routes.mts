import { Router } from 'express';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { z } from '../../../utils/zod.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
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

// Create response schemas using baseAPIResponseSchema
const getEncountersResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(encounterSchema)
});

const getEncounterResponseSchema = baseAPIResponseSchema.extend({
  data: encounterSchema
});

// Define encounter query schema
const encounterQuerySchema = z.object({ campaignId: z.string().optional() });

// Define routes
router.get(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get all encounters, optionally filtered by campaignId',
      requestParams: {
        query: encounterQuerySchema
      },
      responses: {
        200: {
          description: 'Encounters retrieved successfully',
          content: {
            'application/json': {
              schema: getEncountersResponseSchema.openapi({
                description: 'Encounters response'
              })
            }
          }
        }
      }
    })
  ),
  encounterController.getEncounters
);

router.get(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get encounter by ID',
      requestParams: {
        path: z.object({ id: z.string() }),
        query: encounterQuerySchema
      },
      responses: {
        200: {
          description: 'Encounter retrieved successfully',
          content: {
            'application/json': {
              schema: getEncounterResponseSchema.openapi({
                description: 'Encounter response'
              })
            }
          }
        }
      }
    })
  ),
  encounterController.getEncounter
);

router.post(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new encounter',
      requestBody: {
        content: {
          'application/json': {
            schema: encounterCreateSchema.openapi({
              description: 'Create encounter request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Encounter created successfully',
          content: {
            'application/json': {
              schema: getEncounterResponseSchema.openapi({
                description: 'Create encounter response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(encounterCreateSchema),
  encounterController.createEncounter
);

router.patch(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Update an encounter by ID (partial update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: encounterPatchSchema.openapi({
              description: 'Patch encounter request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Encounter patched successfully',
          content: {
            'application/json': {
              schema: getEncounterResponseSchema.openapi({
                description: 'Patch encounter response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(encounterPatchSchema),
  encounterController.updateEncounter
);

router.delete(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Delete an encounter by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Encounter deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete encounter response'
              })
            }
          }
        }
      }
    })
  ),
  encounterController.deleteEncounter
);

export const encounterRoutes = router;

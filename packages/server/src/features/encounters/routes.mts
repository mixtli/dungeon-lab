import { Router } from 'express';
import { EncounterController } from './controllers/encounters.controller.mjs';
import { EncounterService } from './services/encounters.service.mjs';
import { authenticate } from '../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../middleware/validation.middleware.mjs';
import { z } from '../../utils/zod.mjs';
import { createPathSchema, oapi } from '../../oapi.mjs';
import {
  encounterSchema,
  createEncounterSchema,
  updateEncounterSchema,
  EncounterStatusEnum
} from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import {
  baseAPIResponseSchema,
  deleteAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controller
const encounterService = new EncounterService();
const encounterController = new EncounterController(encounterService);

// Create router
const router = Router();

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

const getEncountersResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(encounterSchema)
});

const getEncounterResponseSchema = baseAPIResponseSchema.extend({
  data: encounterSchema
});


// ============================================================================
// QUERY SCHEMAS
// ============================================================================

const encounterQuerySchema = z.object({
  campaignId: z.string().optional()
});

const statusUpdateSchema = z.object({
  status: EncounterStatusEnum
});

// ============================================================================
// ENCOUNTER ROUTES
// ============================================================================

/**
 * GET /encounters - Get all encounters
 */
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
        },
        401: {
          description: 'Unauthorized'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  encounterController.getEncounters
);

/**
 * GET /encounters/:id - Get encounter by ID
 */
router.get(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get encounter by ID',
      requestParams: {
        path: z.object({ id: z.string() })
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
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied'
        },
        404: {
          description: 'Encounter not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  encounterController.getEncounter
);

/**
 * POST /encounters - Create a new encounter
 */
router.post(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new encounter',
      requestBody: {
        content: {
          'application/json': {
            schema: createEncounterSchema.openapi({
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
        },
        400: {
          description: 'Invalid request data'
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied - only GMs can create encounters'
        },
        404: {
          description: 'Campaign or map not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  validateRequest(createEncounterSchema),
  encounterController.createEncounter
);

/**
 * PATCH /encounters/:id - Update an encounter
 */
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
            schema: updateEncounterSchema.openapi({
              description: 'Update encounter request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Encounter updated successfully',
          content: {
            'application/json': {
              schema: getEncounterResponseSchema.openapi({
                description: 'Update encounter response'
              })
            }
          }
        },
        400: {
          description: 'Invalid request data'
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied'
        },
        404: {
          description: 'Encounter not found'
        },
        409: {
          description: 'Version conflict'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  validateRequest(updateEncounterSchema),
  encounterController.updateEncounter
);

/**
 * DELETE /encounters/:id - Delete an encounter
 */
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
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied'
        },
        404: {
          description: 'Encounter not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  encounterController.deleteEncounter
);

/**
 * PATCH /encounters/:id/status - Update encounter status
 */
router.patch(
  '/:id/status',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Update encounter status',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: statusUpdateSchema.openapi({
              description: 'Status update request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Encounter status updated successfully',
          content: {
            'application/json': {
              schema: getEncounterResponseSchema.openapi({
                description: 'Status update response'
              })
            }
          }
        },
        400: {
          description: 'Invalid status'
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied'
        },
        404: {
          description: 'Encounter not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  validateRequest(statusUpdateSchema),
  encounterController.updateEncounterStatus
);







export const encounterRoutes = router; 
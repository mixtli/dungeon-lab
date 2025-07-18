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
  tokenSchema,
  createTokenSchema,
  updateTokenSchema
} from '@dungeon-lab/shared/schemas/tokens.schema.mjs';
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

const getTokensResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(tokenSchema)
});

const getTokenResponseSchema = baseAPIResponseSchema.extend({
  data: tokenSchema
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

// ============================================================================
// TOKEN ROUTES
// ============================================================================

/**
 * GET /encounters/:encounterId/tokens - Get all tokens for an encounter
 */
router.get(
  '/:encounterId/tokens',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get all tokens for an encounter',
      requestParams: {
        path: z.object({ encounterId: z.string() })
      },
      responses: {
        200: {
          description: 'Tokens retrieved successfully',
          content: {
            'application/json': {
              schema: getTokensResponseSchema.openapi({
                description: 'Tokens response'
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
  encounterController.getTokens
);

/**
 * POST /encounters/:encounterId/tokens - Create a new token
 */
router.post(
  '/:encounterId/tokens',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new token in an encounter',
      requestParams: {
        path: z.object({ encounterId: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: createTokenSchema.openapi({
              description: 'Create token request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Token created successfully',
          content: {
            'application/json': {
              schema: getTokenResponseSchema.openapi({
                description: 'Create token response'
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
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  validateRequest(createTokenSchema),
  encounterController.createToken
);

/**
 * PATCH /encounters/:encounterId/tokens/:tokenId - Update a token
 */
router.patch(
  '/:encounterId/tokens/:tokenId',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Update a token by ID',
      requestParams: {
        path: z.object({
          encounterId: z.string(),
          tokenId: z.string()
        })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: updateTokenSchema.openapi({
              description: 'Update token request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Token updated successfully',
          content: {
            'application/json': {
              schema: getTokenResponseSchema.openapi({
                description: 'Update token response'
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
          description: 'Encounter or token not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  validateRequest(updateTokenSchema),
  encounterController.updateToken
);

/**
 * DELETE /encounters/:encounterId/tokens/:tokenId - Delete a token
 */
router.delete(
  '/:encounterId/tokens/:tokenId',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Delete a token by ID',
      requestParams: {
        path: z.object({
          encounterId: z.string(),
          tokenId: z.string()
        })
      },
      responses: {
        200: {
          description: 'Token deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete token response'
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
          description: 'Encounter or token not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  encounterController.deleteToken
);

/**
 * POST /encounters/:encounterId/tokens/from-actor - Create a token from an actor
 */
router.post(
  '/:encounterId/tokens/from-actor',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new token from an existing actor template',
      requestParams: {
        path: z.object({ encounterId: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              actorId: z.string().describe('ID of the actor to create token from'),
              position: z.object({
                x: z.number().min(0).describe('X position on the grid'),
                y: z.number().min(0).describe('Y position on the grid')
              }).describe('Position on the encounter map')
            }).openapi({
              description: 'Create token from actor request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Token created successfully from actor',
          content: {
            'application/json': {
              schema: getTokenResponseSchema.openapi({
                description: 'Create token from actor response'
              })
            }
          }
        },
        400: {
          description: 'Invalid request data or position'
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied'
        },
        404: {
          description: 'Encounter or actor not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  encounterController.createTokenFromActor
);

/**
 * POST /encounters/:encounterId/tokens/:tokenId/duplicate - Duplicate a token
 */
router.post(
  '/:encounterId/tokens/:tokenId/duplicate',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Duplicate an existing token multiple times',
      requestParams: {
        path: z.object({
          encounterId: z.string(),
          tokenId: z.string()
        })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              count: z.number().int().min(1).max(20).optional().describe('Number of duplicates to create (1-20)'),
              offsetX: z.number().optional().describe('X position offset for each duplicate'),
              offsetY: z.number().optional().describe('Y position offset for each duplicate')
            }).openapi({
              description: 'Duplicate token request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Token(s) duplicated successfully',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema.extend({
                data: z.array(tokenSchema)
              }).openapi({
                description: 'Duplicate token response'
              })
            }
          }
        },
        400: {
          description: 'Invalid request data or count'
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Access denied'
        },
        404: {
          description: 'Encounter or token not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    })
  ),
  encounterController.duplicateToken
);

export const encounterRoutes = router; 
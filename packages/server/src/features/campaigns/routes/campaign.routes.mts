import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import {
  encounterPatchSchema,
  encounterSchema
} from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPut,
  openApiDelete,
  openApiPatch,
  toQuerySchema
} from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import { createSchema } from 'zod-openapi';
import {
  createGameSessionSchema,
  searchCampaignsQuerySchema,
  deleteAPIResponseSchema,
  baseAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { campaignSchema } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import {
  campaignCreateSchema,
  campaignPatchSchema
} from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import { gameSessionSchema } from '@dungeon-lab/shared/schemas/game-session.schema.mjs';

// Initialize services and controllers
const campaignService = new CampaignService();
const campaignController = new CampaignController(campaignService);
const encounterService = new EncounterService();
const encounterController = new EncounterController(encounterService);
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Campaign routes
router.get(
  '/',
  authenticate,
  openApiGet(searchCampaignsQuerySchema, {
    description:
      'Get all campaigns for the authenticated user with optional filtering by query parameters',
    parameters: toQuerySchema(searchCampaignsQuerySchema),
    responses: {
      200: {
        description: 'Campaigns retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              z.array(campaignSchema).openapi({
                description: 'Campaigns response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getMyCampaigns
);

router.get(
  '/:id',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get campaign by ID',
    responses: {
      200: {
        description: 'Campaign retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Campaign response'
              })
            )
          }
        }
      },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getCampaign
);

router.post(
  '/',
  authenticate,
  openApiPost(campaignCreateSchema, {
    description: 'Create a new campaign',
    responses: {
      201: {
        description: 'Campaign created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Create campaign response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid campaign data' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(campaignCreateSchema),
  campaignController.createCampaign
);

router.put(
  '/:id',
  authenticate,
  openApiPut(campaignCreateSchema, {
    description: 'Replace a campaign by ID (full update)',
    responses: {
      200: {
        description: 'Campaign updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Update campaign response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid campaign data' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(campaignCreateSchema),
  campaignController.putCampaign
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(campaignPatchSchema, {
    description: 'Update a campaign by ID (partial update)',
    responses: {
      200: {
        description: 'Campaign patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Patch campaign response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid campaign data' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(campaignPatchSchema),
  campaignController.patchCampaign
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.null(), {
    description: 'Delete a campaign by ID',
    responses: {
      204: { description: 'Campaign deleted successfully' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({}).openapi({
                description: 'Delete campaign response'
              })
            )
          }
        }
      }
    }
  }),
  campaignController.deleteCampaign
);

// Campaign encounter routes
router.get(
  '/:campaignId/encounters',
  authenticate,
  openApiGet(baseAPIResponseSchema.extend({ data: z.array(encounterSchema) }), {
    description: 'Get all encounters for a campaign'
  }),
  encounterController.getEncounters
);

router.post(
  '/:campaignId/encounters',
  authenticate,
  openApiPost(baseAPIResponseSchema.extend({ data: encounterSchema }), {
    description: 'Create a new encounter in a campaign'
  }),
  validateRequest(encounterSchema),
  encounterController.createEncounter
);

router.get(
  '/:campaignId/encounters/:id',
  authenticate,
  openApiGetOne(baseAPIResponseSchema.extend({ data: encounterSchema }), {
    description: 'Get an encounter by ID in a campaign'
  }),
  encounterController.getEncounter
);

router.patch(
  '/:campaignId/encounters/:id',
  authenticate,
  openApiPatch(baseAPIResponseSchema.extend({ data: encounterSchema }), {
    description: 'Update an encounter by ID in a campaign'
  }),
  validateRequest(encounterPatchSchema),
  encounterController.updateEncounter
);

router.delete(
  '/:campaignId/encounters/:id',
  authenticate,
  openApiDelete(deleteAPIResponseSchema, {
    description: 'Delete an encounter by ID in a campaign'
  }),
  encounterController.deleteEncounter
);

// Campaign game session routes
router.get(
  '/:campaignId/sessions',
  authenticate,
  openApiGet(z.null(), {
    description: 'Get all game sessions for a campaign',
    responses: {
      200: {
        description: 'Campaign game sessions retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(gameSessionSchema) }).openapi({
                description: 'Campaign game sessions response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  gameSessionController.getCampaignSessions
);

router.get(
  '/:campaignId/sessions/:id',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get a game session by ID in a campaign',
    responses: {
      200: {
        description: 'Game session retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: gameSessionSchema }).openapi({
                description: 'Game session response'
              })
            )
          }
        }
      },
      404: { description: 'Game session not found' },
      500: { description: 'Server error' }
    }
  }),
  gameSessionController.getGameSession
);

router.post(
  '/:campaignId/sessions',
  authenticate,
  openApiPost(baseAPIResponseSchema.extend({ data: gameSessionSchema }), {
    description: 'Create a new game session in a campaign',
    responses: {
      201: {
        description: 'Game session created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: gameSessionSchema }).openapi({
                description: 'Create game session response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid game session data' },
      403: { description: 'Only the game master can create sessions' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(createGameSessionSchema),
  gameSessionController.createGameSession
);

// Active session and encounter routes
router.get(
  '/:campaignId/active-session',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get the active game session for a campaign',
    responses: {
      200: {
        description: 'Active session retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: gameSessionSchema }).openapi({
                description: 'Active session response'
              })
            )
          }
        }
      },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getActiveCampaignSession
);

router.get(
  '/:campaignId/active-encounter',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get the active encounter for a campaign',
    responses: {
      200: {
        description: 'Active encounter retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: encounterSchema }).openapi({
                description: 'Active encounter response'
              })
            )
          }
        }
      },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getActiveCampaignEncounter
);

export { router as campaignRoutes };

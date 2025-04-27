import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { encounterSchema } from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
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
  getCampaignsResponseSchema,
  getCampaignResponseSchema,
  createCampaignRequestSchema,
  createCampaignResponseSchema,
  putCampaignRequestSchema,
  putCampaignResponseSchema,
  patchCampaignRequestSchema,
  patchCampaignResponseSchema,
  deleteCampaignResponseSchema,
  searchCampaignsQuerySchema,
  getCampaignSessionsResponseSchema,
  getGameSessionResponseSchema,
  createGameSessionResponseSchema,
  createGameSessionSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controllers
const campaignService = new CampaignService();
const campaignController = new CampaignController(campaignService);
const encounterService = new EncounterService();
const encounterController = new EncounterController(encounterService);
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Bind campaign controller methods
const boundGetMyCampaigns = campaignController.getMyCampaigns.bind(campaignController);
const boundGetCampaign = campaignController.getCampaign.bind(campaignController);
const boundCreateCampaign = campaignController.createCampaign.bind(campaignController);
const boundPutCampaign = campaignController.putCampaign.bind(campaignController);
const boundPatchCampaign = campaignController.patchCampaign.bind(campaignController);
const boundDeleteCampaign = campaignController.deleteCampaign.bind(campaignController);

// Bind encounter controller methods
const boundGetEncounters = encounterController.getEncounters.bind(encounterController);
const boundCreateEncounter = encounterController.createEncounter.bind(encounterController);
const boundGetEncounter = encounterController.getEncounter.bind(encounterController);
const boundUpdateEncounter = encounterController.updateEncounter.bind(encounterController);
const boundDeleteEncounter = encounterController.deleteEncounter.bind(encounterController);

// Bind game session controller methods
const boundGetCampaignSessions =
  gameSessionController.getCampaignSessions.bind(gameSessionController);
const boundGetGameSession = gameSessionController.getGameSession.bind(gameSessionController);
const boundCreateGameSession = gameSessionController.createGameSession.bind(gameSessionController);

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
              getCampaignsResponseSchema.openapi({
                description: 'Campaigns response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundGetMyCampaigns
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
              getCampaignResponseSchema.openapi({
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
  boundGetCampaign
);

router.post(
  '/',
  authenticate,
  openApiPost(createCampaignRequestSchema, {
    description: 'Create a new campaign',
    responses: {
      201: {
        description: 'Campaign created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              createCampaignResponseSchema.openapi({
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
  validateRequest(createCampaignRequestSchema),
  boundCreateCampaign
);

router.put(
  '/:id',
  authenticate,
  openApiPut(putCampaignRequestSchema, {
    description: 'Replace a campaign by ID (full update)',
    responses: {
      200: {
        description: 'Campaign updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              putCampaignResponseSchema.openapi({
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
  validateRequest(putCampaignRequestSchema),
  boundPutCampaign
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(patchCampaignRequestSchema, {
    description: 'Update a campaign by ID (partial update)',
    responses: {
      200: {
        description: 'Campaign patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              patchCampaignResponseSchema.openapi({
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
  validateRequest(patchCampaignRequestSchema),
  boundPatchCampaign
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
              deleteCampaignResponseSchema.openapi({
                description: 'Delete campaign response'
              })
            )
          }
        }
      }
    }
  }),
  boundDeleteCampaign
);

// Campaign encounter routes
router.get(
  '/:campaignId/encounters',
  authenticate,
  openApiGet(encounterSchema, {
    description: 'Get all encounters for a campaign'
  }),
  boundGetEncounters
);

router.post(
  '/:campaignId/encounters',
  authenticate,
  openApiPost(encounterSchema, {
    description: 'Create a new encounter in a campaign'
  }),
  validateRequest(encounterSchema),
  boundCreateEncounter
);

router.get(
  '/:campaignId/encounters/:id',
  authenticate,
  openApiGetOne(encounterSchema, {
    description: 'Get an encounter by ID in a campaign'
  }),
  boundGetEncounter
);

router.patch(
  '/:campaignId/encounters/:id',
  authenticate,
  openApiPatch(encounterSchema, {
    description: 'Update an encounter by ID in a campaign'
  }),
  validateRequest(encounterSchema.partial()),
  boundUpdateEncounter
);

router.delete(
  '/:campaignId/encounters/:id',
  authenticate,
  openApiDelete(encounterSchema, {
    description: 'Delete an encounter by ID in a campaign'
  }),
  boundDeleteEncounter
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
              getCampaignSessionsResponseSchema.openapi({
                description: 'Campaign game sessions response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundGetCampaignSessions
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
              getGameSessionResponseSchema.openapi({
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
  boundGetGameSession
);

router.post(
  '/:campaignId/sessions',
  authenticate,
  openApiPost(createGameSessionSchema, {
    description: 'Create a new game session in a campaign',
    responses: {
      201: {
        description: 'Game session created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              createGameSessionResponseSchema.openapi({
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
  boundCreateGameSession
);

export { router as campaignRoutes };

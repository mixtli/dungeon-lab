import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { campaignSchema } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import { gameSessionSchema } from '@dungeon-lab/shared/schemas/game-session.schema.mjs';
import { encounterSchema } from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPut,
  openApiDelete,
  openApiPatch
} from '../../../oapi.mjs';
import { deepPartial } from '@dungeon-lab/shared/utils/deepPartial.mjs';

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
  openApiGet(campaignSchema, {
    description:
      'Get all campaigns for the authenticated user with optional filtering by query parameters',
    parameters: [
      {
        name: 'name',
        in: 'query',
        description: 'Filter by campaign name (case insensitive)',
        required: false,
        schema: { type: 'string' }
      },
      {
        name: 'status',
        in: 'query',
        description: 'Filter by campaign status',
        required: false,
        schema: { type: 'string' }
      },
      {
        name: 'gameSystemId',
        in: 'query',
        description: 'Filter by game system ID',
        required: false,
        schema: { type: 'string' }
      }
    ]
  }),
  boundGetMyCampaigns
);

router.get(
  '/:id',
  authenticate,
  openApiGetOne(campaignSchema, {
    description: 'Get campaign by ID'
  }),
  boundGetCampaign
);

router.post(
  '/',
  authenticate,
  openApiPost(campaignSchema, {
    description: 'Create a new campaign'
  }),
  validateRequest(campaignSchema),
  boundCreateCampaign
);

router.put(
  '/:id',
  authenticate,
  openApiPut(campaignSchema, {
    description: 'Replace a campaign by ID (full update)'
  }),
  validateRequest(campaignSchema),
  boundPutCampaign
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(deepPartial(campaignSchema), {
    description: 'Update a campaign by ID (partial update)'
  }),
  validateRequest(deepPartial(campaignSchema)),
  boundPatchCampaign
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(campaignSchema, {
    description: 'Delete a campaign by ID'
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
  openApiGet(gameSessionSchema, {
    description: 'Get all game sessions for a campaign'
  }),
  boundGetCampaignSessions
);

router.get(
  '/:campaignId/sessions/:id',
  authenticate,
  openApiGetOne(gameSessionSchema, {
    description: 'Get a game session by ID in a campaign'
  }),
  boundGetGameSession
);

router.post(
  '/:campaignId/sessions',
  authenticate,
  openApiPost(gameSessionSchema, {
    description: 'Create a new game session in a campaign'
  }),
  validateRequest(gameSessionSchema),
  boundCreateGameSession
);

export { router as campaignRoutes };

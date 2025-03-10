import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { EncounterController } from '../controllers/encounter.controller.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { campaignCreateSchema, campaignUpdateSchema } from '@dungeon-lab/shared/src/schemas/campaign.schema.mjs';
import { validateCreateEncounter, validateUpdateEncounter } from '../middleware/encounter.validation.mjs';
import { gameSessionCreateSchema } from '@dungeon-lab/shared/src/schemas/game-session.schema.mjs';

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
const boundUpdateCampaign = campaignController.updateCampaign.bind(campaignController);
const boundDeleteCampaign = campaignController.deleteCampaign.bind(campaignController);

// Bind encounter controller methods
const boundGetEncounters = encounterController.getEncounters.bind(encounterController);
const boundCreateEncounter = encounterController.createEncounter.bind(encounterController);
const boundGetEncounter = encounterController.getEncounter.bind(encounterController);
const boundUpdateEncounter = encounterController.updateEncounter.bind(encounterController);
const boundDeleteEncounter = encounterController.deleteEncounter.bind(encounterController);

// Bind game session controller methods
const boundGetCampaignSessions = gameSessionController.getCampaignSessions.bind(gameSessionController);
const boundCreateGameSession = gameSessionController.createGameSession.bind(gameSessionController);
const boundGetGameSession = gameSessionController.getGameSession.bind(gameSessionController);

// Campaign routes
router.get('/', authenticate, boundGetMyCampaigns);
router.get('/:id', authenticate, boundGetCampaign);
router.post('/', authenticate, validateRequest(campaignCreateSchema), boundCreateCampaign);
router.put('/:id', authenticate, validateRequest(campaignUpdateSchema), boundUpdateCampaign);
router.delete('/:id', authenticate, boundDeleteCampaign);

// Campaign encounter routes
router.get('/:campaignId/encounters', authenticate, boundGetEncounters);
router.post('/:campaignId/encounters', authenticate, validateCreateEncounter, boundCreateEncounter);
router.get('/:campaignId/encounters/:id', authenticate, boundGetEncounter);
router.patch('/:campaignId/encounters/:id', authenticate, validateUpdateEncounter, boundUpdateEncounter);
router.delete('/:campaignId/encounters/:id', authenticate, boundDeleteEncounter);

// Campaign game session routes
router.get('/:campaignId/sessions', authenticate, boundGetCampaignSessions);
router.get('/:campaignId/sessions/:id', authenticate, boundGetGameSession);
router.post('/:campaignId/sessions', authenticate, validateRequest(gameSessionCreateSchema), boundCreateGameSession);

export { router as campaignRoutes }; 
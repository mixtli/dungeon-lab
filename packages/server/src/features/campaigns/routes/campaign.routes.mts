import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';

// Initialize services and controllers
const campaignController = new CampaignController();

// Create router
const router = Router();

// Campaign routes
router.get('/', authenticate, campaignController.getMyCampaigns);

router.get('/:id', authenticate, campaignController.getCampaign);

router.post('/', authenticate, campaignController.createCampaign);

router.put('/:id', authenticate, campaignController.putCampaign);

router.patch('/:id', authenticate, campaignController.patchCampaign);

router.delete('/:id', authenticate, campaignController.deleteCampaign);

// Active session and encounter routes
router.get('/:campaignId/active-session', authenticate, campaignController.getActiveCampaignSession);

router.get('/:campaignId/active-encounter', authenticate, campaignController.getActiveCampaignEncounter);

export { router as campaignRoutes };

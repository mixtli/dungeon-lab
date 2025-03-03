import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

// Create the campaign controller instance
const campaignController = new CampaignController();

// Create the router
const campaignRouter = Router();

// Apply authentication middleware to all campaign routes
campaignRouter.use(authenticate);

// Define campaign routes
campaignRouter.get('/', campaignController.getMyCampaigns);
campaignRouter.get('/:id', campaignController.getCampaign);
campaignRouter.post('/', campaignController.createCampaign);
campaignRouter.put('/:id', campaignController.updateCampaign);
campaignRouter.delete('/:id', campaignController.deleteCampaign);

// Export the router
export const campaignRoutes = campaignRouter; 
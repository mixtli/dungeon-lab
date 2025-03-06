import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth.middleware.mjs';
import * as campaignController from '../controllers/campaign.controller.mjs';

const campaignRouter = Router();

// Apply authentication middleware to all routes
campaignRouter.use(authenticate as RequestHandler);

// Campaign routes
campaignRouter.get('/', campaignController.getMyCampaigns as RequestHandler);
campaignRouter.get('/:id', campaignController.getCampaign as RequestHandler);
campaignRouter.post('/', campaignController.createCampaign as RequestHandler);
campaignRouter.put('/:id', campaignController.updateCampaign as RequestHandler);
campaignRouter.delete('/:id', campaignController.deleteCampaign as RequestHandler);

export default campaignRouter; 
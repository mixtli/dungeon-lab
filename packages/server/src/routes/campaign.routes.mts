import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { validateRequest } from '../middleware/validation.middleware.mjs';
import { campaignSchema } from '@dungeon-lab/shared/index.mjs';
import { 
  createCampaign, 
  getCampaign, 
  getMyCampaigns, 
  updateCampaign, 
  deleteCampaign 
} from '../controllers/campaign.controller.mjs';
import { getCampaignSessions } from '../controllers/game-session.controller.mjs';

const router = Router();

// Get all campaigns for current user
router.get('/', authenticate, getMyCampaigns);

// Get a specific campaign
router.get('/:id', authenticate, getCampaign);

// Get all sessions for a campaign
router.get('/:campaignId/sessions', authenticate, getCampaignSessions);

// Create a new campaign
router.post('/',
  authenticate,
  validateRequest(campaignSchema),
  createCampaign
);

// Update a campaign
router.put('/:id',
  authenticate,
  validateRequest(campaignSchema.partial()),
  updateCampaign
);

// Delete a campaign
router.delete('/:id', authenticate, deleteCampaign);

export default router; 
import { Router } from 'express';
import { InviteController } from '../controllers/invite.controller.js';
import { InviteService } from '../services/invite.service.js';
import { CampaignService } from '../services/campaign.service.js';

// Initialize services and controller
const campaignService = new CampaignService();
const inviteService = new InviteService(campaignService);
const inviteController = new InviteController(inviteService);

// Create router
const router = Router();

// Get all invites (with optional filters)
router.get('/', inviteController.getInvites);

// Create invite
router.post('/', inviteController.createInvite);

// Respond to an invite
router.post('/:id/respond', inviteController.respondToInvite);

export default router;
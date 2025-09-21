import { Router } from 'express';
import { InviteController } from '../controllers/invite.controller.mjs';
import { InviteService } from '../services/invite.service.mjs';
import { CampaignService } from '../services/campaign.service.mjs';

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
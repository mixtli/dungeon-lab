import { Router } from 'express';
import { inviteCreateSchema, InviteStatus, inviteSchema } from '@dungeon-lab/shared/index.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { InviteController } from '../controllers/invite.controller.mjs';
import { InviteService } from '../services/invite.service.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { z } from '@dungeon-lab/shared/lib/zod.mjs';
import { openApiGet, openApiPost } from '../../../oapi.mjs';

// Initialize services and controller
const campaignService = new CampaignService();
const inviteService = new InviteService(campaignService);
const inviteController = new InviteController(inviteService);

// Create router
const router = Router();

// Create response schema for validation
const respondSchema = z.object({
  status: InviteStatus,
  actorId: z.string().optional()
});

// Bind controller methods to maintain correct 'this' context
const getInvites = inviteController.getInvites.bind(inviteController);
const getMyInvites = inviteController.getMyInvites.bind(inviteController);
const createInvite = inviteController.createInvite.bind(inviteController);
const respondToInvite = inviteController.respondToInvite.bind(inviteController);

// Get invites for a campaign
router.get('/campaign/:campaignId/invites', openApiGet(inviteSchema, {
  description: 'Get all invites for a campaign'
}), getInvites);

// Get invites for the current user
router.get('/my-invites', openApiGet(inviteSchema, {
  description: 'Get all invites for the current user'
}), getMyInvites);

// Create invite
router.post(
  '/campaign/:campaignId/invites',
  openApiPost(inviteCreateSchema, {
    description: 'Create a new invite for a campaign'
  }),
  validateRequest(inviteCreateSchema),
  createInvite
);

// Respond to an invite
router.post(
  '/invites/:id/respond',
  openApiPost(respondSchema, {
    description: 'Respond to an invite',
    responses: {
      200: {
        description: 'Invite response processed successfully'
      }
    }
  }),
  validateRequest(respondSchema),
  respondToInvite
);

export default router; 
import { Router } from 'express';
import { z } from 'zod';
import { inviteSchema } from '@dungeon-lab/shared/index.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { validateRequest } from '../middleware/validation.middleware.mjs';
import * as inviteController from '../controllers/campaign-invites.controller.mjs';

const router = Router();

// Create invite schema for validation
const createInviteSchema = inviteSchema.omit({
  createdBy: true,
  updatedBy: true,
  status: true,
  expiresAt: true,
});

// Create invite
router.post('/',
  authenticate,
  validateRequest(createInviteSchema),
  inviteController.createInvite
);

// Get invites for a campaign
router.get('/campaign/:campaignId',
  authenticate,
  inviteController.getCampaignInvites
);

// Get invites for the current user
router.get('/my-invites',
  authenticate,
  inviteController.getMyInvites
);

// Accept or decline an invite
router.put('/:inviteId/respond',
  authenticate,
  validateRequest(z.object({
    status: z.enum(['accepted', 'declined']),
    actorId: z.string().optional() // Required only when accepting
  })),
  inviteController.respondToInvite
);

export default router; 
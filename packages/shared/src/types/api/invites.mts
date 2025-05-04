import { z } from 'zod';
import { inviteSchema, inviteStatusSchema } from '../../schemas/invite.schema.mjs';
import { baseAPIResponseSchema } from './base.mjs';

// Types for GET /campaign/:campaignId/invites (List campaign invites)
export const getCampaignInvitesResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(inviteSchema)
});
export type GetCampaignInvitesResponse = z.infer<typeof getCampaignInvitesResponseSchema>;
// Types for GET /my-invites (List user invites)

export const getMyInvitesResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(inviteSchema)
});
export type GetMyInvitesResponse = z.infer<typeof getMyInvitesResponseSchema>;

// Types for POST /campaign/:campaignId/invites (Create invite)
export const createInviteRequestSchema = inviteSchema.omit({
  id: true
});
export type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;

export const createInviteResponseSchema = baseAPIResponseSchema.extend({
  data: inviteSchema.optional()
});
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

// Types for POST /invites/:id/respond (Respond to invite)
export const respondToInviteRequestSchema = z.object({
  status: inviteStatusSchema,
  actorId: z.string().optional()
});
export type RespondToInviteRequest = z.infer<typeof respondToInviteRequestSchema>;

export const respondToInviteResponseSchema = baseAPIResponseSchema.extend({
  data: inviteSchema.optional()
});
export type RespondToInviteResponse = z.infer<typeof respondToInviteResponseSchema>;

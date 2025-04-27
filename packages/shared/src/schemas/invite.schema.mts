import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
// Invite Status enum
export const InviteStatus = z.enum(['pending', 'accepted', 'declined', 'expired']);

// Base Invite schema
export const inviteSchema = baseSchema.extend({
  campaignId: z.string(),
  email: z.string().email(),
  status: InviteStatus.default('pending'),
  expiresAt: z.date().optional()
});

export type IInvite = z.infer<typeof inviteSchema>;

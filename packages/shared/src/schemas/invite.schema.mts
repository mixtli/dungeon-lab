import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
// Invite Status enum
export const inviteStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired']);

// Base Invite schema
export const inviteSchema = baseSchema.extend({
  campaignId: z.string(),
  email: z.string().email(),
  status: inviteStatusSchema.default('pending'),
  expiresAt: z.string().optional()
});

import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
// Campaign Status enum
export const CampaignStatus = z.enum(['planning', 'active', 'completed', 'archived']);

// Base Campaign schema
export const campaignSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  members: z.array(z.string()).default([]), // Actor IDs of the characters in the campaign.  NOT User IDs.
  gameMasterId: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).default('active'),
  setting: z.string().optional(),
  startDate: z.string().default(new Date().toISOString())
});

// Export types generated from the schemas
export type ICampaign = z.infer<typeof campaignSchema>;
// export type ICampaignCreateData = z.infer<typeof campaignCreateSchema>;
// export type ICampaignUpdateData = z.infer<typeof campaignUpdateSchema>;

import { z } from '../lib/zod.js';
import { zId } from '@zodyac/zod-mongoose';

// Campaign Status enum
export const CampaignStatus = z.enum(['planning', 'active', 'completed', 'archived']);

// Base Campaign schema
export const campaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  gameSystemId: zId('GameSystem'),
  status: CampaignStatus.default('planning'),
  createdBy: zId('User'),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create data schema (omits auto-generated fields)
export const campaignCreateSchema = campaignSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

// Update data schema (makes all fields optional except id)
export const campaignUpdateSchema = campaignSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    gameSystemId: true,
  })
  .partial();

// Export types generated from the schemas
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignCreateData = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateData = z.infer<typeof campaignUpdateSchema>; 
import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Campaign Status enum
export const CampaignStatus = z.enum(['planning', 'active', 'completed', 'archived']);

// Base Campaign schema
export const campaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  gameSystemId: zId('GameSystem'),
  members: z.array(zId('User')),
  gameMasterId: zId('User'),
  status: CampaignStatus.default('planning'),
  createdBy: zId('User'),
  updatedBy: zId('User'),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// Create data schema (omits auto-generated fields)
export const campaignCreateSchema = campaignSchema.omit({
  createdBy: true,
  updatedBy: true,
  members: true,
}).extend({
  members: z.array(zId('User')).default([]),
});

// Update data schema (makes all fields optional except updatedBy)
export const campaignUpdateSchema = campaignSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types generated from the schemas
export type ICampaign = z.infer<typeof campaignSchema> & ApiFields;
export type ICampaignCreateData = z.infer<typeof campaignCreateSchema>;
export type ICampaignUpdateData = z.infer<typeof campaignUpdateSchema>; 
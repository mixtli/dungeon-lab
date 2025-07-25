import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { actorSchema } from './actor.schema.mjs';
import { userSchema } from './user.schema.mjs';
// Campaign Status enum
export const campaignStatusSchema = z.enum([
  'planning',
  'paused',
  'active',
  'completed',
  'archived'
]);

// Base Campaign schema
export const campaignSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  userData: z.record(z.string(), z.any()).optional(),
  description: z.string().optional(),
  pluginId: z.string().min(1),
  
  // Campaign-level plugin data (global persistent state)
  pluginData: z.record(z.string(), z.unknown()).default({}),
  
  characterIds: z.array(z.string()).default([]), // Actor IDs of the characters in the campaign.  NOT User IDs.
  gameMasterId: z.string().optional(), // This is the User ID of the game master.
  status: campaignStatusSchema.default('active'),
  setting: z.string().optional(),
  startDate: z.string().default(new Date().toISOString())
});

export const campaignCreateSchema = campaignSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

export const campaignWithVirtualsSchema = campaignSchema.extend({
  characters: z.array(actorSchema).default([]),
  gameMaster: userSchema.optional(),
});

export const campaignPatchSchema = campaignSchema.deepPartial();

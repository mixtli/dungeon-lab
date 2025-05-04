import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { userSchema } from './user.schema.mjs';
import { campaignSchema } from './campaign.schema.mjs';
import { actorSchema } from '../index.mjs';
// Game Session Status enum
export const GameSessionStatus = z.enum(['active', 'paused', 'ended', 'scheduled']);

// Base GameSession schema
export const gameSessionSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  campaignId: z.string(),
  description: z.string().optional(),
  status: GameSessionStatus.default('scheduled'),
  participantIds: z.array(z.string()).default([]), // User IDs of the participants in the game session.
  characterIds: z.array(z.string()).default([]), // Character IDs of the participants in the game session.
  gameMasterId: z.string(),
  settings: z.record(z.string(), z.unknown()).optional()
});

export const gameSessionCreateSchema = gameSessionSchema.omit({
  id: true,
  participantIds: true,
  characterIds: true,
});

export const gameSessionWithVirtualsSchema = gameSessionSchema.extend({
  characters: z.array(actorSchema).default([]),
  gameMaster: userSchema.optional(),
  campaign: campaignSchema.optional(),
  participants: z.array(userSchema).default([]),
});

export const gameSessionResponseSchema = gameSessionSchema.extend({
  characters: z.array(actorSchema).default([]),
  participants: z.array(userSchema).default([]),
  gameMaster: userSchema.optional(),
  campaign: campaignSchema.optional()
});

export const gameSessionPatchSchema = gameSessionSchema.deepPartial();

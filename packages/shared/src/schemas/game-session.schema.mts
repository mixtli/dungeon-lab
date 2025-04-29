import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
// Game Session Status enum
export const GameSessionStatus = z.enum(['active', 'paused', 'ended', 'scheduled']);

// Base GameSession schema
export const gameSessionSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  campaignId: z.string(),
  description: z.string().optional(),
  status: GameSessionStatus.default('scheduled'),
  participantIds: z.array(z.string()).default([]),
  gameMasterId: z.string(),
  settings: z.record(z.string(), z.unknown()).optional()
});

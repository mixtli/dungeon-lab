import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { userSchema } from './user.schema.mjs';
import { campaignSchema } from './campaign.schema.mjs';
import { baseDocumentSchema } from './document.schema.mjs';
import { serverGameStateSchema } from './server-game-state.schema.mjs';
// Game Session Status enum
export const GameSessionStatus = z.enum(['active', 'paused', 'ended', 'scheduled']);

// Base GameSession schema
export const gameSessionSchema = baseSchema.extend({
  // Session metadata (not duplicated in gameState)
  name: z.string().min(1).max(255),
  campaignId: z.string(),
  gameMasterId: z.string(),
  description: z.string().optional(),
  status: GameSessionStatus.default('scheduled'),
  settings: z.record(z.string(), z.unknown()).optional(),
  
  // User management (for session access control - not duplicated in gameState)
  participantIds: z.array(z.string()).default([]), // User IDs of participants in session
  
  // Unified game state fields
  gameState: serverGameStateSchema.nullable().default(null), // Complete session state
  gameStateVersion: z.string().default('0'),                 // Incrementing version for optimistic concurrency control
  gameStateHash: z.string().nullable().default(null),        // Hash for state integrity verification
  lastStateUpdate: z.number().nullable().default(null)       // Timestamp of last state update
});

export const gameSessionCreateSchema = gameSessionSchema.omit({
  id: true,
  gameMasterId: true,  // Should be inferred from authenticated user
  participantIds: true,
  gameState: true,
  gameStateVersion: true,
  gameStateHash: true,
  lastStateUpdate: true
});

export const gameSessionWithVirtualsSchema = gameSessionSchema.extend({
  characters: z.array(baseDocumentSchema).default([]),
  gameMaster: userSchema.optional(),
  campaign: campaignSchema.optional(),
  participants: z.array(userSchema).default([]),
});

export const gameSessionResponseSchema = gameSessionSchema.extend({
  characters: z.array(baseDocumentSchema).default([]),
  participants: z.array(userSchema).default([]),
  gameMaster: userSchema.optional(),
  campaign: campaignSchema.optional()
});

export const gameSessionPatchSchema = gameSessionSchema.deepPartial();

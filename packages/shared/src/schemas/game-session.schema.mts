import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { userSchema } from './user.schema.mjs';
import { campaignSchema } from './campaign.schema.mjs';
import { baseDocumentSchema } from './document.schema.mjs';
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
  
  // Time tracking fields
  scheduledStartTime: z.string().optional(), // When session is scheduled to start
  actualStartTime: z.string().optional(),    // When session actually started
  actualEndTime: z.string().optional(),      // When session actually ended
  
  // User management (for session access control)
  participantIds: z.array(z.string()).default([]) // User IDs of participants in session
});

export const gameSessionCreateSchema = gameSessionSchema.omit({
  id: true,
  gameMasterId: true,  // Should be inferred from authenticated user
  participantIds: true,
  actualStartTime: true,  // Set by server when session starts
  actualEndTime: true     // Set by server when session ends
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

// State transition validation schema
export const gameSessionStateTransitionSchema = z.object({
  fromStatus: GameSessionStatus,
  toStatus: GameSessionStatus
}).refine((data) => {
  // Valid transitions defined by the state machine
  const validTransitions: Record<string, string[]> = {
    scheduled: ['active', 'ended'],
    active: ['paused', 'ended'],
    paused: ['active', 'ended'],
    ended: [] // No transitions from ended state
  };
  
  return validTransitions[data.fromStatus]?.includes(data.toStatus) ?? false;
}, {
  message: "Invalid state transition"
});

// Session creation validation with time constraints
export const gameSessionCreateWithValidationSchema = gameSessionCreateSchema.refine((data) => {
  // If scheduledStartTime is provided and status is scheduled, it must be in the future
  if (data.scheduledStartTime && data.status === 'scheduled') {
    const now = new Date();
    return new Date(data.scheduledStartTime) > now;
  }
  return true;
}, {
  message: "Scheduled start time must be in the future"
});

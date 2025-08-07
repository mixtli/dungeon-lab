import { z } from 'zod';
import { 
  stateUpdateSchema, 
  stateUpdateResponseSchema, 
  stateUpdateBroadcastSchema 
} from '../game-state-update.schema.mjs';

// Client-to-server event argument schemas
export const gameStateUpdateArgsSchema = z.tuple([
  stateUpdateSchema
]);

export const gameStateRequestFullArgsSchema = z.tuple([
  z.string() // sessionId
]);

export const gameSessionJoinArgsSchema = z.tuple([
  z.string() // sessionId
]);

export const gameSessionLeaveArgsSchema = z.tuple([
  z.string() // sessionId
]);

export const gameSessionEndArgsSchema = z.tuple([
  z.string() // sessionId
]);

// Server-to-client event schemas
export const gameStateUpdatedSchema = stateUpdateBroadcastSchema;

export const gameStateErrorSchema = z.object({
  sessionId: z.string(),
  error: z.object({
    code: z.enum(['VERSION_CONFLICT', 'VALIDATION_ERROR', 'TRANSACTION_FAILED', 'SESSION_NOT_FOUND', 'PERMISSION_DENIED']),
    message: z.string(),
    currentVersion: z.string().optional(),
    currentHash: z.string().optional()
  })
});

// Full state response for reconnection/refresh
export const gameStateFullResponseSchema = z.object({
  sessionId: z.string(),
  gameState: z.unknown(), // ServerGameState - using unknown to avoid circular imports
  gameStateVersion: z.string(),
  gameStateHash: z.string(),
  timestamp: z.number()
});

// Session management schemas
export const gameSessionJoinedSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  userName: z.string(),
  isGM: z.boolean(),
  timestamp: z.number()
});

export const gameSessionLeftSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  userName: z.string(),
  timestamp: z.number()
});

export const gameSessionEndedSchema = z.object({
  sessionId: z.string(),
  endedBy: z.string(),
  timestamp: z.number()
});

// Callback schemas for client-to-server events
export const gameStateUpdateCallbackSchema = stateUpdateResponseSchema;
export const gameStateRequestFullCallbackSchema = gameStateFullResponseSchema;
export const gameSessionJoinCallbackSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  error: z.string().optional()
});
export const gameSessionLeaveCallbackSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

export const gameSessionEndCallbackSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  error: z.string().optional()
});
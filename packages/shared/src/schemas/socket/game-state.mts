import { z } from 'zod';
import { 
  stateUpdateSchema, 
  stateUpdateResponseSchema, 
  stateUpdateBroadcastSchema 
} from '../game-state-update.schema.mjs';
import {
  baseSocketCallbackSchema,
  socketCallbackWithDataSchema,
  socketCallbackWithFieldsSchema
} from './base-callback.schema.mjs';

// Callback schemas for client-to-server events (defined first for reference)
export const gameStateUpdateCallbackSchema = stateUpdateResponseSchema;

// Full state response data for reconnection/refresh
export const gameStateFullDataSchema = z.object({
  sessionId: z.string(),
  gameState: z.unknown(), // ServerGameState - using unknown to avoid circular imports
  gameStateVersion: z.string(),
  gameStateHash: z.string(),
  timestamp: z.number()
});

// Full state callback with consistent success/error pattern
export const gameStateRequestFullCallbackSchema = socketCallbackWithDataSchema(gameStateFullDataSchema);

export const gameSessionJoinCallbackSchema = socketCallbackWithFieldsSchema({
  session: z.unknown().optional() // Populated session data
});

export const gameSessionLeaveCallbackSchema = baseSocketCallbackSchema;

export const gameSessionEndCallbackSchema = socketCallbackWithFieldsSchema({
  sessionId: z.string().optional()
});

// Sync encounter callback - simple success/error response
export const gameStateSyncEncounterCallbackSchema = baseSocketCallbackSchema;

// Client-to-server event argument schemas
export const gameStateUpdateArgsSchema = z.tuple([
  stateUpdateSchema,
  z.function().args(gameStateUpdateCallbackSchema).optional() // callback
]);

export const gameStateRequestFullArgsSchema = z.tuple([
  z.string(), // sessionId
  z.function().args(gameStateRequestFullCallbackSchema).optional() // callback
]);

export const gameSessionJoinArgsSchema = z.tuple([
  z.string(), // sessionId
  z.function().args(gameSessionJoinCallbackSchema).optional() // callback
]);

export const gameSessionLeaveArgsSchema = z.tuple([
  z.string(), // sessionId
  z.function().args(gameSessionLeaveCallbackSchema).optional() // callback
]);

export const gameSessionEndArgsSchema = z.tuple([
  z.string(), // sessionId
  z.function().args(gameSessionEndCallbackSchema).optional() // callback
]);

export const gameStateSyncEncounterArgsSchema = z.tuple([
  z.string(), // sessionId
  z.function().args(gameStateSyncEncounterCallbackSchema).optional() // callback
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


import { z } from 'zod';
import {
  encounterSchema
} from '../../schemas/encounters.schema.mjs';
import { socketCallbackWithDataSchema } from './base-callback.schema.mjs';

// ============================================================================
// ENCOUNTER STATE EVENTS
// ============================================================================

// ============================================================================
// ENCOUNTER LIFECYCLE EVENTS
// ============================================================================

export const encounterStartSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string()
});

export const encounterStartedSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  encounter: encounterSchema,
  timestamp: z.date().default(() => new Date())
});

export const encounterStoppedSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const encounterPauseSchema = z.object({
  encounterId: z.string(),
  userId: z.string()
});

export const encounterPausedSchema = z.object({
  encounterId: z.string(),
  status: z.literal('paused'),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const encounterEndSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  userId: z.string()
});

export const encounterEndedSchema = z.object({
  encounterId: z.string(),
  status: z.literal('completed'),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// ERROR EVENTS
// ============================================================================

export const encounterErrorSchema = z.object({
  encounterId: z.string(),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// CALLBACK SCHEMAS
// ============================================================================

export const encounterCallbackSchema = socketCallbackWithDataSchema(z.unknown());


// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EncounterStart = z.infer<typeof encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterStartedSchema>;
export type EncounterStopped = z.infer<typeof encounterStoppedSchema>;
export type EncounterPause = z.infer<typeof encounterPauseSchema>;
export type EncounterPaused = z.infer<typeof encounterPausedSchema>;
export type EncounterEnd = z.infer<typeof encounterEndSchema>;
export type EncounterEnded = z.infer<typeof encounterEndedSchema>;

export type EncounterError = z.infer<typeof encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterCallbackSchema>; 
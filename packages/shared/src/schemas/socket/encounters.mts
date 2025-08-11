import { z } from 'zod';
import {
  encounterSchema
} from '../../schemas/encounters.schema.mjs';
import { socketCallbackWithDataSchema, baseSocketCallbackSchema } from './base-callback.schema.mjs';

// ============================================================================
// ENCOUNTER STATE EVENTS
// ============================================================================

// ============================================================================
// ENCOUNTER LIFECYCLE EVENTS
// ============================================================================

export const encounterStartSchema = z.object({
  encounterId: z.string()
});

export const encounterStartedSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  encounter: encounterSchema,
  timestamp: z.string().default(() => new Date().toISOString())
});

export const encounterStopSchema = z.object({
  encounterId: z.string()
});

export const encounterStoppedSchema = z.object({
  encounterId: z.string(),
  timestamp: z.string().default(() => new Date().toISOString())
});


// ============================================================================
// ERROR EVENTS
// ============================================================================

export const encounterErrorSchema = z.object({
  encounterId: z.string(),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().default(() => new Date().toISOString())
});

// ============================================================================
// CALLBACK SCHEMAS
// ============================================================================

export const encounterStartCallbackSchema = socketCallbackWithDataSchema(encounterSchema);
export const encounterStopCallbackSchema = baseSocketCallbackSchema;
export const encounterCallbackSchema = socketCallbackWithDataSchema(z.unknown());

// Client-to-server event argument schemas (with callbacks)
export const encounterStartArgsSchema = z.tuple([
  encounterStartSchema,
  z.function().args(encounterStartCallbackSchema).optional() // callback
]);

export const encounterStopArgsSchema = z.tuple([
  encounterStopSchema,
  z.function().args(encounterStopCallbackSchema).optional() // callback
]);


// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type EncounterStart = z.infer<typeof encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterStartedSchema>;
export type EncounterStop = z.infer<typeof encounterStopSchema>;
export type EncounterStopped = z.infer<typeof encounterStoppedSchema>;

export type EncounterError = z.infer<typeof encounterErrorSchema>;
export type EncounterStartCallback = z.infer<typeof encounterStartCallbackSchema>;
export type EncounterStopCallback = z.infer<typeof encounterStopCallbackSchema>;
export type EncounterCallback = z.infer<typeof encounterCallbackSchema>; 
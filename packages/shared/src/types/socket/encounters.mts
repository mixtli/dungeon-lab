import { z } from 'zod';
import * as encounterSocketSchemas from '../../schemas/socket/encounters.mjs';

// ============================================================================
// ENCOUNTER LIFECYCLE TYPES
// ============================================================================

export type EncounterStart = z.infer<typeof encounterSocketSchemas.encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterSocketSchemas.encounterStartedSchema>;
export type EncounterStop = z.infer<typeof encounterSocketSchemas.encounterStopSchema>;
export type EncounterStopped = z.infer<typeof encounterSocketSchemas.encounterStoppedSchema>;

// ============================================================================
// ERROR AND CALLBACK TYPES
// ============================================================================

export type EncounterError = z.infer<typeof encounterSocketSchemas.encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterSocketSchemas.encounterCallbackSchema>; 
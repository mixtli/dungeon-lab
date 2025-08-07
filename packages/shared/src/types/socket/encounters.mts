import { z } from 'zod';
import * as encounterSocketSchemas from '../../schemas/socket/encounters.mjs';

// ============================================================================
// ENCOUNTER LIFECYCLE TYPES
// ============================================================================

export type EncounterStart = z.infer<typeof encounterSocketSchemas.encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterSocketSchemas.encounterStartedSchema>;
export type EncounterStopped = z.infer<typeof encounterSocketSchemas.encounterStoppedSchema>;
export type EncounterPause = z.infer<typeof encounterSocketSchemas.encounterPauseSchema>;
export type EncounterPaused = z.infer<typeof encounterSocketSchemas.encounterPausedSchema>;
export type EncounterEnd = z.infer<typeof encounterSocketSchemas.encounterEndSchema>;
export type EncounterEnded = z.infer<typeof encounterSocketSchemas.encounterEndedSchema>;

// ============================================================================
// ERROR AND CALLBACK TYPES
// ============================================================================

export type EncounterError = z.infer<typeof encounterSocketSchemas.encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterSocketSchemas.encounterCallbackSchema>; 
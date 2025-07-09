import { z } from 'zod';
import * as encounterSocketSchemas from '../../schemas/socket/encounters.mjs';

// ============================================================================
// ENCOUNTER ROOM EVENT TYPES - REMOVED (using session-based architecture)
// ============================================================================

// ============================================================================
// TOKEN MOVEMENT TYPES
// ============================================================================

export type TokenMove = z.infer<typeof encounterSocketSchemas.tokenMoveSchema>;
export type TokenMoved = z.infer<typeof encounterSocketSchemas.tokenMovedSchema>;
export type TokenMoveCallback = z.infer<typeof encounterSocketSchemas.tokenMoveCallbackSchema>;

// ============================================================================
// TOKEN MANAGEMENT TYPES
// ============================================================================

export type TokenCreate = z.infer<typeof encounterSocketSchemas.tokenCreateSchema>;
export type TokenCreated = z.infer<typeof encounterSocketSchemas.tokenCreatedSchema>;
export type TokenUpdate = z.infer<typeof encounterSocketSchemas.tokenUpdateSchema>;
export type TokenUpdated = z.infer<typeof encounterSocketSchemas.tokenUpdatedSchema>;
export type TokenDelete = z.infer<typeof encounterSocketSchemas.tokenDeleteSchema>;
export type TokenDeleted = z.infer<typeof encounterSocketSchemas.tokenDeletedSchema>;

// ============================================================================
// INITIATIVE TYPES
// ============================================================================

export type InitiativeRoll = z.infer<typeof encounterSocketSchemas.initiativeRollSchema>;
export type InitiativeRolled = z.infer<typeof encounterSocketSchemas.initiativeRolledSchema>;
export type InitiativeUpdate = z.infer<typeof encounterSocketSchemas.initiativeUpdateSchema>;
export type InitiativeUpdated = z.infer<typeof encounterSocketSchemas.initiativeUpdatedSchema>;
export type InitiativeReorder = z.infer<typeof encounterSocketSchemas.initiativeReorderSchema>;
export type InitiativeReordered = z.infer<typeof encounterSocketSchemas.initiativeReorderedSchema>;

// ============================================================================
// TURN MANAGEMENT TYPES
// ============================================================================

export type TurnNext = z.infer<typeof encounterSocketSchemas.turnNextSchema>;
export type TurnChanged = z.infer<typeof encounterSocketSchemas.turnChangedSchema>;
export type TurnSkip = z.infer<typeof encounterSocketSchemas.turnSkipSchema>;
export type TurnSkipped = z.infer<typeof encounterSocketSchemas.turnSkippedSchema>;
export type TurnDelay = z.infer<typeof encounterSocketSchemas.turnDelaySchema>;
export type TurnDelayed = z.infer<typeof encounterSocketSchemas.turnDelayedSchema>;

// ============================================================================
// COMBAT ACTION TYPES
// ============================================================================

export type ActionExecute = z.infer<typeof encounterSocketSchemas.actionExecuteSchema>;
export type ActionExecuted = z.infer<typeof encounterSocketSchemas.actionExecutedSchema>;
export type ActionValidate = z.infer<typeof encounterSocketSchemas.actionValidateSchema>;
export type ActionValidated = z.infer<typeof encounterSocketSchemas.actionValidatedSchema>;

// ============================================================================
// EFFECT TYPES
// ============================================================================

export type EffectApply = z.infer<typeof encounterSocketSchemas.effectApplySchema>;
export type EffectApplied = z.infer<typeof encounterSocketSchemas.effectAppliedSchema>;
export type EffectRemove = z.infer<typeof encounterSocketSchemas.effectRemoveSchema>;
export type EffectRemoved = z.infer<typeof encounterSocketSchemas.effectRemovedSchema>;
export type EffectExpired = z.infer<typeof encounterSocketSchemas.effectExpiredSchema>;

// ============================================================================
// ENCOUNTER STATE TYPES
// ============================================================================

export type EncounterStart = z.infer<typeof encounterSocketSchemas.encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterSocketSchemas.encounterStartedSchema>;
export type EncounterPause = z.infer<typeof encounterSocketSchemas.encounterPauseSchema>;
export type EncounterPaused = z.infer<typeof encounterSocketSchemas.encounterPausedSchema>;
export type EncounterEnd = z.infer<typeof encounterSocketSchemas.encounterEndSchema>;
export type EncounterEnded = z.infer<typeof encounterSocketSchemas.encounterEndedSchema>;

// ============================================================================
// ERROR AND CALLBACK TYPES
// ============================================================================

export type EncounterError = z.infer<typeof encounterSocketSchemas.encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterSocketSchemas.encounterCallbackSchema>; 
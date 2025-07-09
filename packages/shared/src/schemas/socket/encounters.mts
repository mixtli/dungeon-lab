import { z } from 'zod';
import {
  initiativeEntrySchema,
  combatActionSchema,
  actionResultSchema,
  effectSchema,
  effectApplicationSchema
} from '../../schemas/encounters.schema.mjs';
import { gridPositionSchema } from '../../schemas/position.schema.mjs';
import { tokenSchema } from '../../schemas/tokens.schema.mjs';

// ============================================================================
// TOKEN MOVEMENT EVENTS
// ============================================================================

export const tokenMoveSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  tokenId: z.string(),
  position: gridPositionSchema,
  userId: z.string()
});

export const tokenMovedSchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  position: gridPositionSchema,
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const tokenMoveCallbackSchema = z.object({
  success: z.boolean(),
  tokenId: z.string().optional(),
  position: gridPositionSchema.optional(),
  error: z.string().optional()
});

// ============================================================================
// TOKEN MANAGEMENT EVENTS
// ============================================================================

export const tokenCreateSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  tokenData: z.object({
    name: z.string(),
    imageUrl: z.string(),
    size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
    position: gridPositionSchema,
    actorId: z.string().optional(),
    isVisible: z.boolean(),
    isPlayerControlled: z.boolean(),
    data: z.record(z.string(), z.unknown())
  }),
  userId: z.string()
});

export const tokenCreatedSchema = z.object({
  encounterId: z.string(),
  token: tokenSchema,
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const tokenUpdateSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  tokenId: z.string(),
  updates: z.object({
    name: z.string().optional(),
    imageUrl: z.string().optional(),
    size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']).optional(),
    isVisible: z.boolean().optional(),
    data: z.record(z.string(), z.unknown()).optional()
  }),
  userId: z.string()
});

export const tokenUpdatedSchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  token: tokenSchema,
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const tokenDeleteSchema = z.object({
  sessionId: z.string(),
  encounterId: z.string(),
  tokenId: z.string(),
  userId: z.string()
});

export const tokenDeletedSchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// INITIATIVE EVENTS
// ============================================================================

export const initiativeRollSchema = z.object({
  encounterId: z.string(),
  tokenIds: z.array(z.string()).optional(), // if empty, roll for all
  userId: z.string()
});

export const initiativeRolledSchema = z.object({
  encounterId: z.string(),
  entries: z.array(initiativeEntrySchema),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const initiativeUpdateSchema = z.object({
  encounterId: z.string(),
  entryId: z.string(),
  initiative: z.number(),
  userId: z.string()
});

export const initiativeUpdatedSchema = z.object({
  encounterId: z.string(),
  entry: initiativeEntrySchema,
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const initiativeReorderSchema = z.object({
  encounterId: z.string(),
  entryIds: z.array(z.string()), // new order
  userId: z.string()
});

export const initiativeReorderedSchema = z.object({
  encounterId: z.string(),
  entries: z.array(initiativeEntrySchema),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// TURN MANAGEMENT EVENTS
// ============================================================================

export const turnNextSchema = z.object({
  encounterId: z.string(),
  userId: z.string()
});

export const turnChangedSchema = z.object({
  encounterId: z.string(),
  currentTurn: z.number(),
  currentRound: z.number(),
  activeTokenId: z.string().optional(),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const turnSkipSchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  userId: z.string()
});

export const turnSkippedSchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  currentTurn: z.number(),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const turnDelaySchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  userId: z.string()
});

export const turnDelayedSchema = z.object({
  encounterId: z.string(),
  tokenId: z.string(),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// COMBAT ACTION EVENTS
// ============================================================================

export const actionExecuteSchema = z.object({
  encounterId: z.string(),
  action: combatActionSchema,
  userId: z.string()
});

export const actionExecutedSchema = z.object({
  encounterId: z.string(),
  action: combatActionSchema,
  result: actionResultSchema,
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const actionValidateSchema = z.object({
  encounterId: z.string(),
  action: combatActionSchema,
  userId: z.string()
});

export const actionValidatedSchema = z.object({
  encounterId: z.string(),
  actionId: z.string(),
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// EFFECT EVENTS
// ============================================================================

export const effectApplySchema = z.object({
  encounterId: z.string(),
  effect: effectSchema,
  userId: z.string()
});

export const effectAppliedSchema = z.object({
  encounterId: z.string(),
  effect: effectSchema,
  application: effectApplicationSchema,
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const effectRemoveSchema = z.object({
  encounterId: z.string(),
  effectId: z.string(),
  userId: z.string()
});

export const effectRemovedSchema = z.object({
  encounterId: z.string(),
  effectId: z.string(),
  targetId: z.string(),
  userId: z.string(),
  timestamp: z.date().default(() => new Date())
});

export const effectExpiredSchema = z.object({
  encounterId: z.string(),
  effectId: z.string(),
  targetId: z.string(),
  timestamp: z.date().default(() => new Date())
});

// ============================================================================
// ENCOUNTER STATE EVENTS
// ============================================================================

export const encounterStartSchema = z.object({
  encounterId: z.string(),
  userId: z.string()
});

export const encounterStartedSchema = z.object({
  encounterId: z.string(),
  status: z.literal('in_progress'),
  userId: z.string(),
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

export const encounterCallbackSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional()
});

// ============================================================================
// CLIENT-TO-SERVER EVENT ARGS SCHEMAS
// ============================================================================

// Encounter room events removed - using session-based architecture

export const tokenMoveArgsSchema = z.tuple([
  tokenMoveSchema,
  z.function().args(tokenMoveCallbackSchema).optional()
]);

export const tokenCreateArgsSchema = z.tuple([
  tokenCreateSchema
]);

export const tokenUpdateArgsSchema = z.tuple([
  tokenUpdateSchema
]);

export const tokenDeleteArgsSchema = z.tuple([
  tokenDeleteSchema
]);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Encounter room types removed - using session-based architecture

export type TokenMove = z.infer<typeof tokenMoveSchema>;
export type TokenMoved = z.infer<typeof tokenMovedSchema>;
export type TokenMoveCallback = z.infer<typeof tokenMoveCallbackSchema>;

export type TokenCreate = z.infer<typeof tokenCreateSchema>;
export type TokenCreated = z.infer<typeof tokenCreatedSchema>;
export type TokenUpdate = z.infer<typeof tokenUpdateSchema>;
export type TokenUpdated = z.infer<typeof tokenUpdatedSchema>;
export type TokenDelete = z.infer<typeof tokenDeleteSchema>;
export type TokenDeleted = z.infer<typeof tokenDeletedSchema>;

export type InitiativeRoll = z.infer<typeof initiativeRollSchema>;
export type InitiativeRolled = z.infer<typeof initiativeRolledSchema>;
export type InitiativeUpdate = z.infer<typeof initiativeUpdateSchema>;
export type InitiativeUpdated = z.infer<typeof initiativeUpdatedSchema>;
export type InitiativeReorder = z.infer<typeof initiativeReorderSchema>;
export type InitiativeReordered = z.infer<typeof initiativeReorderedSchema>;

export type TurnNext = z.infer<typeof turnNextSchema>;
export type TurnChanged = z.infer<typeof turnChangedSchema>;
export type TurnSkip = z.infer<typeof turnSkipSchema>;
export type TurnSkipped = z.infer<typeof turnSkippedSchema>;
export type TurnDelay = z.infer<typeof turnDelaySchema>;
export type TurnDelayed = z.infer<typeof turnDelayedSchema>;

export type ActionExecute = z.infer<typeof actionExecuteSchema>;
export type ActionExecuted = z.infer<typeof actionExecutedSchema>;
export type ActionValidate = z.infer<typeof actionValidateSchema>;
export type ActionValidated = z.infer<typeof actionValidatedSchema>;

export type EffectApply = z.infer<typeof effectApplySchema>;
export type EffectApplied = z.infer<typeof effectAppliedSchema>;
export type EffectRemove = z.infer<typeof effectRemoveSchema>;
export type EffectRemoved = z.infer<typeof effectRemovedSchema>;
export type EffectExpired = z.infer<typeof effectExpiredSchema>;

export type EncounterStart = z.infer<typeof encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterStartedSchema>;
export type EncounterPause = z.infer<typeof encounterPauseSchema>;
export type EncounterPaused = z.infer<typeof encounterPausedSchema>;
export type EncounterEnd = z.infer<typeof encounterEndSchema>;
export type EncounterEnded = z.infer<typeof encounterEndedSchema>;

export type EncounterError = z.infer<typeof encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterCallbackSchema>; 
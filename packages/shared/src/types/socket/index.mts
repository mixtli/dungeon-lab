import { z } from 'zod';
import * as socketTypes from '../../schemas/socket/index.mjs';
import * as encounterSocketSchemas from '../../schemas/socket/encounters.mjs';

// Export basic socket types
export type MessageParticipant = z.infer<typeof socketTypes.messageParticipantSchema>;
export type ChatMetadata = z.infer<typeof socketTypes.messageMetadataSchema>;
export type JoinCallback = z.infer<typeof socketTypes.joinCallbackSchema>;
export type PluginActionCallback = z.infer<typeof socketTypes.pluginActionCallbackSchema>;
export type MapGenerationResponse = z.infer<typeof socketTypes.mapGenerationResponseSchema>;
export type MapEditResponse = z.infer<typeof socketTypes.mapEditResponseSchema>;
export type MapFeatureDetectionResponse = z.infer<
  typeof socketTypes.mapFeatureDetectionResponseSchema
>;
export type ServerToClientEvents = z.infer<typeof socketTypes.serverToClientEvents>;
export type ClientToServerEvents = z.infer<typeof socketTypes.clientToServerEvents>;

// Export all additional socket types from the schemas
export type SocketMention = z.infer<typeof socketTypes.mentionSchema>;
export type ChatbotTyping = z.infer<typeof socketTypes.chatbotTypingSchema>;
export type ChatbotTypingStop = z.infer<typeof socketTypes.chatbotTypingStopSchema>;
export type ChatbotResponse = z.infer<typeof socketTypes.chatbotResponseSchema>;
export type ChatbotError = z.infer<typeof socketTypes.chatbotErrorSchema>;
export type UserJoinedSession = z.infer<typeof socketTypes.userJoinedSessionSchema>;
export type UserLeftSession = z.infer<typeof socketTypes.userLeftSessionSchema>;

export type RollResult = z.infer<typeof socketTypes.rollResultSchema>;
export type DiceRollRequest = z.infer<typeof socketTypes.diceRollRequestSchema>;
export type DiceRollResponse = z.infer<typeof socketTypes.diceRollResponseSchema>;
export type RollRequest = z.infer<typeof socketTypes.rollRequestSchema>;
export type RollResponse = z.infer<typeof socketTypes.rollResponseSchema>;
export type RollCallback = z.infer<typeof socketTypes.rollCallbackSchema>;

export type MoveMessage = z.infer<typeof socketTypes.moveMessageSchema>;

export type PluginStateUpdate = z.infer<typeof socketTypes.pluginStateUpdateSchema>;

export type WorkflowState = z.infer<typeof socketTypes.workflowStateSchema>;
export type MapGenerationRequest = z.infer<typeof socketTypes.mapGenerationRequestSchema>;
export type MapEditRequest = z.infer<typeof socketTypes.mapEditRequestSchema>;
export type MapFeatureDetectionRequest = z.infer<typeof socketTypes.mapFeatureDetectionRequestSchema>;

// Export encounter socket types
// Note: EncounterJoin, EncounterLeave, and EncounterJoinCallback removed - using session-based architecture

export type TokenMove = z.infer<typeof encounterSocketSchemas.tokenMoveSchema>;
export type TokenMoved = z.infer<typeof encounterSocketSchemas.tokenMovedSchema>;
export type TokenMoveCallback = z.infer<typeof encounterSocketSchemas.tokenMoveCallbackSchema>;

export type TokenCreate = z.infer<typeof encounterSocketSchemas.tokenCreateSchema>;
export type TokenCreated = z.infer<typeof encounterSocketSchemas.tokenCreatedSchema>;
export type TokenUpdate = z.infer<typeof encounterSocketSchemas.tokenUpdateSchema>;
export type TokenUpdated = z.infer<typeof encounterSocketSchemas.tokenUpdatedSchema>;
export type TokenDelete = z.infer<typeof encounterSocketSchemas.tokenDeleteSchema>;
export type TokenDeleted = z.infer<typeof encounterSocketSchemas.tokenDeletedSchema>;

export type InitiativeRoll = z.infer<typeof encounterSocketSchemas.initiativeRollSchema>;
export type InitiativeRolled = z.infer<typeof encounterSocketSchemas.initiativeRolledSchema>;
export type InitiativeUpdate = z.infer<typeof encounterSocketSchemas.initiativeUpdateSchema>;
export type InitiativeUpdated = z.infer<typeof encounterSocketSchemas.initiativeUpdatedSchema>;
export type InitiativeReorder = z.infer<typeof encounterSocketSchemas.initiativeReorderSchema>;
export type InitiativeReordered = z.infer<typeof encounterSocketSchemas.initiativeReorderedSchema>;

export type TurnNext = z.infer<typeof encounterSocketSchemas.turnNextSchema>;
export type TurnChanged = z.infer<typeof encounterSocketSchemas.turnChangedSchema>;
export type TurnSkip = z.infer<typeof encounterSocketSchemas.turnSkipSchema>;
export type TurnSkipped = z.infer<typeof encounterSocketSchemas.turnSkippedSchema>;
export type TurnDelay = z.infer<typeof encounterSocketSchemas.turnDelaySchema>;
export type TurnDelayed = z.infer<typeof encounterSocketSchemas.turnDelayedSchema>;

export type ActionExecute = z.infer<typeof encounterSocketSchemas.actionExecuteSchema>;
export type ActionExecuted = z.infer<typeof encounterSocketSchemas.actionExecutedSchema>;
export type ActionValidate = z.infer<typeof encounterSocketSchemas.actionValidateSchema>;
export type ActionValidated = z.infer<typeof encounterSocketSchemas.actionValidatedSchema>;

export type EffectApply = z.infer<typeof encounterSocketSchemas.effectApplySchema>;
export type EffectApplied = z.infer<typeof encounterSocketSchemas.effectAppliedSchema>;
export type EffectRemove = z.infer<typeof encounterSocketSchemas.effectRemoveSchema>;
export type EffectRemoved = z.infer<typeof encounterSocketSchemas.effectRemovedSchema>;
export type EffectExpired = z.infer<typeof encounterSocketSchemas.effectExpiredSchema>;

export type EncounterStart = z.infer<typeof encounterSocketSchemas.encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterSocketSchemas.encounterStartedSchema>;
export type EncounterPause = z.infer<typeof encounterSocketSchemas.encounterPauseSchema>;
export type EncounterPaused = z.infer<typeof encounterSocketSchemas.encounterPausedSchema>;
export type EncounterEnd = z.infer<typeof encounterSocketSchemas.encounterEndSchema>;
export type EncounterEnded = z.infer<typeof encounterSocketSchemas.encounterEndedSchema>;

export type EncounterError = z.infer<typeof encounterSocketSchemas.encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterSocketSchemas.encounterCallbackSchema>;

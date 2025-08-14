import { z } from 'zod';
import * as socketTypes from '../../schemas/socket/index.mjs';
import * as encounterSocketSchemas from '../../schemas/socket/encounters.mjs';

// Export basic socket types
export type MessageParticipant = z.infer<typeof socketTypes.messageParticipantSchema>;
export type ChatMetadata = z.infer<typeof socketTypes.messageMetadataSchema>;
export type JoinCallback = z.infer<typeof socketTypes.joinCallbackSchema>;
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

// Enhanced types for 3D dice rolling
export type EnhancedRollResult = z.infer<typeof socketTypes.enhancedRollResultSchema>;
export type EnhancedRollResponse = z.infer<typeof socketTypes.enhancedRollResponseSchema>;


export type WorkflowState = z.infer<typeof socketTypes.workflowStateSchema>;
export type MapGenerationRequest = z.infer<typeof socketTypes.mapGenerationRequestSchema>;
export type MapEditRequest = z.infer<typeof socketTypes.mapEditRequestSchema>;
export type MapFeatureDetectionRequest = z.infer<typeof socketTypes.mapFeatureDetectionRequestSchema>;

// Export encounter lifecycle socket types

export type EncounterStart = z.infer<typeof encounterSocketSchemas.encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterSocketSchemas.encounterStartedSchema>;
export type EncounterStop = z.infer<typeof encounterSocketSchemas.encounterStopSchema>;
export type EncounterStopped = z.infer<typeof encounterSocketSchemas.encounterStoppedSchema>;

export type EncounterError = z.infer<typeof encounterSocketSchemas.encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterSocketSchemas.encounterCallbackSchema>;
export type EncounterStartCallback = z.infer<typeof encounterSocketSchemas.encounterStartCallbackSchema>;
export type EncounterStopCallback = z.infer<typeof encounterSocketSchemas.encounterStopCallbackSchema>;



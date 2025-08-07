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

// Export encounter lifecycle socket types

export type EncounterStart = z.infer<typeof encounterSocketSchemas.encounterStartSchema>;
export type EncounterStarted = z.infer<typeof encounterSocketSchemas.encounterStartedSchema>;
export type EncounterStopped = z.infer<typeof encounterSocketSchemas.encounterStoppedSchema>;
export type EncounterPause = z.infer<typeof encounterSocketSchemas.encounterPauseSchema>;
export type EncounterPaused = z.infer<typeof encounterSocketSchemas.encounterPausedSchema>;
export type EncounterEnd = z.infer<typeof encounterSocketSchemas.encounterEndSchema>;
export type EncounterEnded = z.infer<typeof encounterSocketSchemas.encounterEndedSchema>;

export type EncounterError = z.infer<typeof encounterSocketSchemas.encounterErrorSchema>;
export type EncounterCallback = z.infer<typeof encounterSocketSchemas.encounterCallbackSchema>;


// Export GM-Authoritative socket types (server-agnostic action handling)
import * as actionSchemas from '../../schemas/socket/actions.mjs';
import * as gmAuthoritySchemas from '../../schemas/socket/gm-authority.mjs';
import * as heartbeatSchemas from '../../schemas/socket/heartbeat.mjs';

// Game action types (server-agnostic envelope)
export type GameActionRequest = z.infer<typeof actionSchemas.gameActionRequestSchema>;
export type GameActionResult = z.infer<typeof actionSchemas.gameActionResultSchema>;
export type QueuedAction = z.infer<typeof actionSchemas.queuedActionSchema>;

// GM authority types
export type GMAuthorityRequest = z.infer<typeof gmAuthoritySchemas.gmAuthorityRequestSchema>;
export type GMConnectionStatus = z.infer<typeof gmAuthoritySchemas.gmConnectionStatusSchema>;
export type ActionQueueOperation = z.infer<typeof gmAuthoritySchemas.actionQueueOperationSchema>;
export type MessageRoutingStatus = z.infer<typeof gmAuthoritySchemas.messageRoutingStatusSchema>;
export type GMSessionControl = z.infer<typeof gmAuthoritySchemas.gmSessionControlSchema>;

// GM heartbeat types
export type GMHeartbeatPing = z.infer<typeof heartbeatSchemas.gmHeartbeatPingSchema>;
export type GMHeartbeatPong = z.infer<typeof heartbeatSchemas.gmHeartbeatPongSchema>;
export type ConnectionTimeout = z.infer<typeof heartbeatSchemas.connectionTimeoutSchema>;
export type GMReconnection = z.infer<typeof heartbeatSchemas.gmReconnectionSchema>;
export type HeartbeatConfig = z.infer<typeof heartbeatSchemas.heartbeatConfigSchema>;
export type NetworkQuality = z.infer<typeof heartbeatSchemas.networkQualitySchema>;

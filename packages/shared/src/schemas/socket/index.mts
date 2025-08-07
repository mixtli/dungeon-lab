import { z } from 'zod';

// Import all socket schemas from separate files
import {
  mentionSchema,
  messageParticipantSchema,
  messageMetadataSchema,
  joinCallbackSchema,
  chatbotTypingSchema,
  chatbotTypingStopSchema,
  chatbotResponseSchema,
  chatbotErrorSchema,
  userJoinedSessionSchema,
  userLeftSessionSchema,
  // New client-to-server schemas
  joinSessionArgsSchema,
  leaveSessionArgsSchema,
  chatMessageArgsSchema
} from './chat.mjs';

import {
  rollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  rollCallbackSchema,
  // New client-to-server schemas
  rollArgsSchema
} from './dice.mjs';

import {
  moveMessageSchema
} from './movement.mjs';

import {
  pluginActionCallbackSchema,
  pluginStateUpdateSchema,
  // New client-to-server schemas
  pluginActionArgsSchema
} from './plugins.mjs';

import {
  mapGenerationResponseSchema,
  mapEditResponseSchema,
  mapFeatureDetectionResponseSchema,
  workflowProgressCallbackSchema,
  workflowProgressArgsSchema,
  workflowStateSchema,
  mapGenerationRequestSchema,
  mapEditRequestSchema,
  mapFeatureDetectionRequestSchema,
  // New client-to-server schemas
  mapGenerateArgsSchema,
  mapEditArgsSchema,
  mapDetectFeaturesArgsSchema
} from './workflows.mjs';

import {
  // Encounter lifecycle events
  encounterStartSchema,
  encounterStartedSchema,
  encounterStoppedSchema,
  encounterPauseSchema,
  encounterPausedSchema,
  encounterEndSchema,
  encounterEndedSchema,
  // Error events
  encounterErrorSchema,
  encounterCallbackSchema
} from './encounters.mjs';


import {
  // GM-Authoritative action schemas (server-agnostic)
  gameActionRequestSchema,
  gameActionResultSchema,
  queuedActionSchema
} from './actions.mjs';

import {
  // GM authority infrastructure schemas
  gmAuthorityRequestSchema,
  gmConnectionStatusSchema,
  actionQueueOperationSchema,
  messageRoutingStatusSchema,
  gmSessionControlSchema
} from './gm-authority.mjs';

import {
  // GM heartbeat monitoring schemas
  gmHeartbeatPingSchema,
  gmHeartbeatPongSchema,
  connectionTimeoutSchema,
  gmReconnectionSchema,
  heartbeatConfigSchema,
  networkQualitySchema
} from './heartbeat.mjs';

import {
  // Game state management schemas
  gameStateUpdateArgsSchema,
  gameStateRequestFullArgsSchema,
  gameSessionJoinArgsSchema,
  gameSessionLeaveArgsSchema,
  gameSessionEndArgsSchema,
  gameStateUpdatedSchema,
  gameStateErrorSchema,
  gameStateFullResponseSchema,
  gameSessionJoinedSchema,
  gameSessionLeftSchema,
  gameSessionEndedSchema,
  gameStateUpdateCallbackSchema,
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema
} from './game-state.mjs';

// Re-export all schemas for backwards compatibility
export {
  // Chat schemas
  mentionSchema,
  messageParticipantSchema,
  messageMetadataSchema,
  joinCallbackSchema,
  chatbotTypingSchema,
  chatbotTypingStopSchema,
  chatbotResponseSchema,
  chatbotErrorSchema,
  userJoinedSessionSchema,
  userLeftSessionSchema,
  joinSessionArgsSchema,
  leaveSessionArgsSchema,
  chatMessageArgsSchema,
  
  // Dice schemas
  rollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  rollCallbackSchema,
  rollArgsSchema,
  
  // Movement schemas
  moveMessageSchema,
  
  // Plugin schemas
  pluginActionCallbackSchema,
  pluginStateUpdateSchema,
  pluginActionArgsSchema,
  
  // Workflow schemas
  mapGenerationResponseSchema,
  mapEditResponseSchema,
  mapFeatureDetectionResponseSchema,
  workflowProgressCallbackSchema,
  workflowProgressArgsSchema,
  workflowStateSchema,
  mapGenerationRequestSchema,
  mapEditRequestSchema,
  mapFeatureDetectionRequestSchema,
  mapGenerateArgsSchema,
  mapEditArgsSchema,
  mapDetectFeaturesArgsSchema,
  
  // Encounter lifecycle schemas  
  encounterStartSchema,
  encounterStartedSchema,
  encounterStoppedSchema,
  encounterPauseSchema,
  encounterPausedSchema,
  encounterEndSchema,
  encounterEndedSchema,
  encounterErrorSchema,
  encounterCallbackSchema,
  
  
  // GM-Authoritative action schemas (server-agnostic)
  gameActionRequestSchema,
  gameActionResultSchema,
  queuedActionSchema,
  
  // GM authority infrastructure schemas
  gmAuthorityRequestSchema,
  gmConnectionStatusSchema,
  actionQueueOperationSchema,
  messageRoutingStatusSchema,
  gmSessionControlSchema,
  
  // GM heartbeat monitoring schemas
  gmHeartbeatPingSchema,
  gmHeartbeatPongSchema,
  connectionTimeoutSchema,
  gmReconnectionSchema,
  heartbeatConfigSchema,
  networkQualitySchema,
  
  // Game state management schemas
  gameStateUpdateArgsSchema,
  gameStateRequestFullArgsSchema,
  gameSessionJoinArgsSchema,
  gameSessionLeaveArgsSchema,
  gameSessionEndArgsSchema,
  gameStateUpdatedSchema,
  gameStateErrorSchema,
  gameStateFullResponseSchema,
  gameSessionJoinedSchema,
  gameSessionLeftSchema,
  gameSessionEndedSchema,
  gameStateUpdateCallbackSchema,
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema
};

// ============================================================================
// SOCKET.IO EVENT DEFINITIONS
// ============================================================================

export const serverToClientEvents = z.object({
  chat: z.function().args(messageMetadataSchema, z.string(/* message */)).returns(z.void()),
  error: z.function().args(z.string()).returns(z.void()),
  diceRoll: z.function().args(diceRollResponseSchema).returns(z.void()),
  'roll-result': z.function().args(rollResponseSchema).returns(z.void()),
  move: z.function().args(moveMessageSchema).returns(z.void()),
  pluginStateUpdate: z.function().args(pluginStateUpdateSchema).returns(z.void()),
  // Encounter management now handled via session rooms
  userJoinedSession: z.function().args(userJoinedSessionSchema).returns(z.void()),
  userLeftSession: z.function().args(userLeftSessionSchema).returns(z.void()),
  'workflow:progress:generate-map': z.function().args(workflowProgressArgsSchema).returns(z.void()),
  'workflow:state:generate-map': z.function().args(workflowStateSchema).returns(z.void()),
  'workflow:progress:edit-map': z.function().args(workflowProgressArgsSchema).returns(z.void()),
  'workflow:state:edit-map': z.function().args(workflowStateSchema).returns(z.void()),
  'workflow:progress:detect-map-features': z.function().args(workflowProgressArgsSchema).returns(z.void()),
  'workflow:state:detect-map-features': z.function().args(workflowStateSchema).returns(z.void()),
  'chatbot:typing': z.function().args(chatbotTypingSchema).returns(z.void()),
  'chatbot:typing-stop': z.function().args(chatbotTypingStopSchema).returns(z.void()),
  'chatbot:response': z.function().args(chatbotResponseSchema).returns(z.void()),
  'chatbot:error': z.function().args(chatbotErrorSchema).returns(z.void()),
  // Encounter events
  'encounter:started': z.function().args(encounterStartedSchema).returns(z.void()),
  'encounter:stopped': z.function().args(encounterStoppedSchema).returns(z.void()),
  'encounter:error': z.function().args(encounterErrorSchema).returns(z.void()),
  'user:joined': z.function().args(userJoinedSessionSchema).returns(z.void()),
  'user:left': z.function().args(userLeftSessionSchema).returns(z.void()),
  
  // GM-Authoritative action events (server routes without understanding game logic)
  'action:result': z.function().args(gameActionResultSchema).returns(z.void()),
  'action:queued': z.function().args(queuedActionSchema).returns(z.void()),
  
  // GM authority events
  'gm:connection-status': z.function().args(gmConnectionStatusSchema).returns(z.void()),
  'gm:queue-operation': z.function().args(actionQueueOperationSchema).returns(z.void()),
  'gm:routing-status': z.function().args(messageRoutingStatusSchema).returns(z.void()),
  
  // GM heartbeat events
  'heartbeat:ping': z.function().args(gmHeartbeatPingSchema).returns(z.void()),
  'heartbeat:timeout': z.function().args(connectionTimeoutSchema).returns(z.void()),
  'heartbeat:reconnection': z.function().args(gmReconnectionSchema).returns(z.void()),
  'heartbeat:quality': z.function().args(networkQualitySchema).returns(z.void()),
  
  // Game state management events
  'gameState:updated': z.function().args(gameStateUpdatedSchema).returns(z.void()),
  'gameState:error': z.function().args(gameStateErrorSchema).returns(z.void()),
  'gameSession:joined': z.function().args(gameSessionJoinedSchema).returns(z.void()),
  'gameSession:left': z.function().args(gameSessionLeftSchema).returns(z.void()),
  'gameSession:ended': z.function().args(gameSessionEndedSchema).returns(z.void())
});

export const clientToServerEvents = z.object({
  chat: z.function().args(...chatMessageArgsSchema.items).returns(z.void()),
  joinSession: z.function().args(...joinSessionArgsSchema.items).returns(z.void()),
  leaveSession: z.function().args(...leaveSessionArgsSchema.items).returns(z.void()),
  pluginAction: z.function().args(...pluginActionArgsSchema.items).returns(z.void()),
  diceRoll: z.function().args(diceRollRequestSchema).returns(z.void()),
  roll: z.function().args(...rollArgsSchema.items).returns(z.void()),
  move: z.function().args(moveMessageSchema).returns(z.void()),
  'encounter:start': z.function().args(encounterStartSchema).returns(z.void()),
  'encounter:stop': z.function().args(encounterEndSchema).returns(z.void()),
  'map:generate': z.function().args(...mapGenerateArgsSchema.items).returns(z.void()),
  'map:edit': z.function().args(...mapEditArgsSchema.items).returns(z.void()),
  'map:detect-features': z.function().args(...mapDetectFeaturesArgsSchema.items).returns(z.void()),
  
  // GM-Authoritative action events (server-agnostic routing)
  'action:request': z.function().args(gameActionRequestSchema).returns(z.void()),
  
  // GM authority events
  'gm:authority-request': z.function().args(gmAuthorityRequestSchema).returns(z.void()),
  'gm:session-control': z.function().args(gmSessionControlSchema).returns(z.void()),
  
  // GM heartbeat events
  'heartbeat:pong': z.function().args(gmHeartbeatPongSchema).returns(z.void()),
  'heartbeat:config': z.function().args(heartbeatConfigSchema).returns(z.void()),
  
  // Game state management events
  'gameState:update': z.function().args(...gameStateUpdateArgsSchema.items).returns(z.void()),
  'gameState:requestFull': z.function().args(...gameStateRequestFullArgsSchema.items).returns(z.void()),
  'gameSession:join': z.function().args(...gameSessionJoinArgsSchema.items).returns(z.void()),
  'gameSession:leave': z.function().args(...gameSessionLeaveArgsSchema.items).returns(z.void()),
  'gameSession:end': z.function().args(...gameSessionEndArgsSchema.items).returns(z.void())
});

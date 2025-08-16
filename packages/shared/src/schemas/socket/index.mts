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
  chatMessageArgsSchema
} from './chat.mjs';

import {
  rollSchema,
  rollServerResultSchema,
  rollCallbackSchema,
  rollArgsSchema
} from '../roll.schema.mjs';

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
  encounterStopSchema,
  encounterStoppedSchema,
  // Error events
  encounterErrorSchema,
  // Callback schemas
  encounterStartCallbackSchema,
  encounterStopCallbackSchema,
  encounterCallbackSchema,
  // Args schemas
  encounterStartArgsSchema,
  encounterStopArgsSchema
} from './encounters.mjs';





import {
  // Game state management schemas
  gameStateUpdateArgsSchema,
  gameStateRequestFullArgsSchema,
  gameSessionJoinArgsSchema,
  gameSessionLeaveArgsSchema,
  gameSessionEndArgsSchema,
  gameStateUpdatedSchema,
  gameStateErrorSchema,
  gameStateFullDataSchema,
  gameSessionJoinedSchema,
  gameSessionLeftSchema,
  gameSessionEndedSchema,
  gameSessionPausedSchema,
  gameSessionResumedSchema,
  gameStateReinitializedSchema,
  gameStateUpdateCallbackSchema,
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema,
  gameStateResetHashCallbackSchema,
  gameStateResetHashArgsSchema,
  gameStateReinitializeCallbackSchema,
  gameStateReinitializeArgsSchema,
  gameStateCheckStatusCallbackSchema,
  gameStateCheckStatusArgsSchema
} from './game-state.mjs';

import {
  gameActionRequestArgsSchema,
  gameActionGmRequestArgsSchema,
  gameActionResponseArgsSchema
} from './game-actions.mjs';

import {
  baseSocketCallbackSchema,
  socketCallbackWithDataSchema,
  socketCallbackWithFieldsSchema
} from './base-callback.schema.mjs';

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
  chatMessageArgsSchema,
  
  // Roll schemas
  rollSchema,
  rollServerResultSchema,
  rollCallbackSchema,
  rollArgsSchema,
  
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
  encounterStopSchema,
  encounterStoppedSchema,
  encounterErrorSchema,
  // Encounter callback schemas
  encounterStartCallbackSchema,
  encounterStopCallbackSchema,
  encounterCallbackSchema,
  // Encounter args schemas
  encounterStartArgsSchema,
  encounterStopArgsSchema,
  
  // Game state management schemas
  gameStateUpdateArgsSchema,
  gameStateRequestFullArgsSchema,
  gameSessionJoinArgsSchema,
  gameSessionLeaveArgsSchema,
  gameSessionEndArgsSchema,
  gameStateUpdatedSchema,
  gameStateErrorSchema,
  gameStateFullDataSchema,
  gameSessionJoinedSchema,
  gameSessionLeftSchema,
  gameSessionEndedSchema,
  gameSessionPausedSchema,
  gameSessionResumedSchema,
  gameStateReinitializedSchema,
  gameStateUpdateCallbackSchema,
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema,
  gameStateResetHashCallbackSchema,
  gameStateResetHashArgsSchema,
  gameStateReinitializeCallbackSchema,
  gameStateReinitializeArgsSchema,
  gameStateCheckStatusCallbackSchema,
  gameStateCheckStatusArgsSchema,
  
  // Base callback schemas
  baseSocketCallbackSchema,
  socketCallbackWithDataSchema,
  socketCallbackWithFieldsSchema
};

// ============================================================================
// SOCKET.IO EVENT DEFINITIONS
// ============================================================================

export const serverToClientEvents = z.object({
  chat: z.function().args(messageMetadataSchema, z.string(/* message */)).returns(z.void()),
  error: z.function().args(z.string()).returns(z.void()),
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
  'encounter:error': z.function().args(encounterErrorSchema).returns(z.void()),
  'user:joined': z.function().args(userJoinedSessionSchema).returns(z.void()),
  'user:left': z.function().args(userLeftSessionSchema).returns(z.void()),
  // Roll events
  'roll:result': z.function().args(rollServerResultSchema).returns(z.void()),
  // Game state management events
  'gameState:updated': z.function().args(gameStateUpdatedSchema).returns(z.void()),
  'gameState:error': z.function().args(gameStateErrorSchema).returns(z.void()),
  'gameState:reinitialized': z.function().args(gameStateReinitializedSchema).returns(z.void()),
  'gameSession:joined': z.function().args(gameSessionJoinedSchema).returns(z.void()),
  'gameSession:left': z.function().args(gameSessionLeftSchema).returns(z.void()),
  'gameSession:ended': z.function().args(gameSessionEndedSchema).returns(z.void()),
  'gameSession:paused': z.function().args(gameSessionPausedSchema).returns(z.void()),
  'gameSession:resumed': z.function().args(gameSessionResumedSchema).returns(z.void()),
  // GM receives action requests forwarded from server
  'gameAction:forward': z.function().args(...gameActionGmRequestArgsSchema.items).returns(z.void())
});

export const clientToServerEvents = z.object({
  chat: z.function().args(...chatMessageArgsSchema.items).returns(z.void()),
  roll: z.function().args(...rollArgsSchema.items).returns(z.void()),
  'encounter:start': z.function().args(...encounterStartArgsSchema.items).returns(z.void()),
  'encounter:stop': z.function().args(...encounterStopArgsSchema.items).returns(z.void()),
  'map:generate': z.function().args(...mapGenerateArgsSchema.items).returns(z.void()),
  'map:edit': z.function().args(...mapEditArgsSchema.items).returns(z.void()),
  'map:detect-features': z.function().args(...mapDetectFeaturesArgsSchema.items).returns(z.void()),
  // Game state management events
  'gameState:update': z.function().args(...gameStateUpdateArgsSchema.items).returns(z.void()),
  'gameState:requestFull': z.function().args(...gameStateRequestFullArgsSchema.items).returns(z.void()),
  'gameState:resetHash': z.function().args(...gameStateResetHashArgsSchema.items).returns(z.void()),
  'gameState:reinitialize': z.function().args(...gameStateReinitializeArgsSchema.items).returns(z.void()),
  'gameState:checkStatus': z.function().args(...gameStateCheckStatusArgsSchema.items).returns(z.void()),
  'gameSession:join': z.function().args(...gameSessionJoinArgsSchema.items).returns(z.void()),
  'gameSession:leave': z.function().args(...gameSessionLeaveArgsSchema.items).returns(z.void()),
  'gameSession:end': z.function().args(...gameSessionEndArgsSchema.items).returns(z.void()),
  // Game action request events
  'gameAction:request': z.function().args(...gameActionRequestArgsSchema.items).returns(z.void()),
  // GM responds to action requests
  'gameAction:response': z.function().args(...gameActionResponseArgsSchema.items).returns(z.void())
});

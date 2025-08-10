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
  // Game state management schemas
  gameStateUpdateArgsSchema,
  gameStateRequestFullArgsSchema,
  gameSessionJoinArgsSchema,
  gameSessionLeaveArgsSchema,
  gameSessionEndArgsSchema,
  gameStateSyncEncounterArgsSchema,
  gameStateUpdatedSchema,
  gameStateErrorSchema,
  gameStateFullDataSchema,
  gameSessionJoinedSchema,
  gameSessionLeftSchema,
  gameSessionEndedSchema,
  gameSessionPausedSchema,
  gameSessionResumedSchema,
  gameStateUpdateCallbackSchema,
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema,
  gameStateSyncEncounterCallbackSchema
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
  
  // Dice schemas
  rollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
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
  encounterStoppedSchema,
  encounterPauseSchema,
  encounterPausedSchema,
  encounterEndSchema,
  encounterEndedSchema,
  encounterErrorSchema,
  encounterCallbackSchema,
  
  // Game state management schemas
  gameStateUpdateArgsSchema,
  gameStateRequestFullArgsSchema,
  gameSessionJoinArgsSchema,
  gameSessionLeaveArgsSchema,
  gameSessionEndArgsSchema,
  gameStateSyncEncounterArgsSchema,
  gameStateUpdatedSchema,
  gameStateErrorSchema,
  gameStateFullDataSchema,
  gameSessionJoinedSchema,
  gameSessionLeftSchema,
  gameSessionEndedSchema,
  gameSessionPausedSchema,
  gameSessionResumedSchema,
  gameStateUpdateCallbackSchema,
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema,
  gameStateSyncEncounterCallbackSchema,
  
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
  diceRoll: z.function().args(diceRollResponseSchema).returns(z.void()),
  'roll-result': z.function().args(rollResponseSchema).returns(z.void()),
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
  // Game state management events
  'gameState:updated': z.function().args(gameStateUpdatedSchema).returns(z.void()),
  'gameState:error': z.function().args(gameStateErrorSchema).returns(z.void()),
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
  diceRoll: z.function().args(diceRollRequestSchema).returns(z.void()),
  roll: z.function().args(...rollArgsSchema.items).returns(z.void()),
  'encounter:start': z.function().args(encounterStartSchema).returns(z.void()),
  'encounter:stop': z.function().args(encounterEndSchema).returns(z.void()),
  'map:generate': z.function().args(...mapGenerateArgsSchema.items).returns(z.void()),
  'map:edit': z.function().args(...mapEditArgsSchema.items).returns(z.void()),
  'map:detect-features': z.function().args(...mapDetectFeaturesArgsSchema.items).returns(z.void()),
  // Game state management events
  'gameState:update': z.function().args(...gameStateUpdateArgsSchema.items).returns(z.void()),
  'gameState:requestFull': z.function().args(...gameStateRequestFullArgsSchema.items).returns(z.void()),
  'gameState:syncEncounter': z.function().args(...gameStateSyncEncounterArgsSchema.items).returns(z.void()),
  'gameSession:join': z.function().args(...gameSessionJoinArgsSchema.items).returns(z.void()),
  'gameSession:leave': z.function().args(...gameSessionLeaveArgsSchema.items).returns(z.void()),
  'gameSession:end': z.function().args(...gameSessionEndArgsSchema.items).returns(z.void()),
  // Game action request events
  'gameAction:request': z.function().args(...gameActionRequestArgsSchema.items).returns(z.void()),
  // GM responds to action requests
  'gameAction:response': z.function().args(...gameActionResponseArgsSchema.items).returns(z.void())
});

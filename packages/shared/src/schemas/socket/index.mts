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
  // Token events
  tokenMoveSchema,
  tokenMovedSchema,
  tokenMoveCallbackSchema,
  tokenCreateSchema,
  tokenCreatedSchema,
  tokenUpdateSchema,
  tokenUpdatedSchema,
  tokenDeleteSchema,
  tokenDeletedSchema,
  // Initiative events
  initiativeRollSchema,
  initiativeRolledSchema,
  initiativeUpdateSchema,
  initiativeUpdatedSchema,
  initiativeReorderSchema,
  initiativeReorderedSchema,
  // Turn management
  turnNextSchema,
  turnChangedSchema,
  turnSkipSchema,
  turnSkippedSchema,
  turnDelaySchema,
  turnDelayedSchema,
  // Action events
  actionExecuteSchema,
  actionExecutedSchema,
  actionValidateSchema,
  actionValidatedSchema,
  // Effect events
  effectApplySchema,
  effectAppliedSchema,
  effectRemoveSchema,
  effectRemovedSchema,
  effectExpiredSchema,
  // Encounter state
  encounterStartSchema,
  encounterStartedSchema,
  encounterStoppedSchema,
  encounterPauseSchema,
  encounterPausedSchema,
  encounterEndSchema,
  encounterEndedSchema,
  // Error events
  encounterErrorSchema,
  encounterCallbackSchema,
  // Client-to-server args schemas
  tokenMoveArgsSchema,
  tokenCreateArgsSchema,
  tokenUpdateArgsSchema,
  tokenDeleteArgsSchema
} from './encounters.mjs';

import {
  // Actor event schemas
  actorCallbackSchema,
  actorListArgsSchema,
  actorGetArgsSchema,
  actorUpdateArgsSchema,
  actorDeleteArgsSchema,
  actorCreatedSchema,
  actorUpdatedSchema,
  actorDeletedSchema
} from './actors.mjs';

import {
  // Item event schemas
  itemCallbackSchema,
  itemListArgsSchema,
  itemGetArgsSchema,
  itemCreateArgsSchema,
  itemUpdateArgsSchema,
  itemDeleteArgsSchema,
  itemCreatedSchema,
  itemUpdatedSchema,
  itemDeletedSchema
} from './items.mjs';

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
  
  // Encounter event schemas  
  tokenMoveSchema,
  tokenMovedSchema,
  tokenMoveCallbackSchema,
  tokenCreateSchema,
  tokenCreatedSchema,
  tokenUpdateSchema,
  tokenUpdatedSchema,
  tokenDeleteSchema,
  tokenDeletedSchema,
  initiativeRollSchema,
  initiativeRolledSchema,
  initiativeUpdateSchema,
  initiativeUpdatedSchema,
  initiativeReorderSchema,
  initiativeReorderedSchema,
  turnNextSchema,
  turnChangedSchema,
  turnSkipSchema,
  turnSkippedSchema,
  turnDelaySchema,
  turnDelayedSchema,
  actionExecuteSchema,
  actionExecutedSchema,
  actionValidateSchema,
  actionValidatedSchema,
  effectApplySchema,
  effectAppliedSchema,
  effectRemoveSchema,
  effectRemovedSchema,
  effectExpiredSchema,
  encounterStartSchema,
  encounterStartedSchema,
  encounterPauseSchema,
  encounterPausedSchema,
  encounterEndSchema,
  encounterEndedSchema,
  encounterErrorSchema,
  encounterCallbackSchema,
  tokenMoveArgsSchema,
  tokenCreateArgsSchema,
  tokenUpdateArgsSchema,
  tokenDeleteArgsSchema,
  
  // Actor schemas
  actorCallbackSchema,
  actorListArgsSchema,
  actorGetArgsSchema,
  actorUpdateArgsSchema,
  actorDeleteArgsSchema,
  actorCreatedSchema,
  actorUpdatedSchema,
  actorDeletedSchema,
  
  // Item schemas
  itemCallbackSchema,
  itemListArgsSchema,
  itemGetArgsSchema,
  itemCreateArgsSchema,
  itemUpdateArgsSchema,
  itemDeleteArgsSchema,
  itemCreatedSchema,
  itemUpdatedSchema,
  itemDeletedSchema
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
  'token:moved': z.function().args(tokenMovedSchema).returns(z.void()),
  'token:created': z.function().args(tokenCreatedSchema).returns(z.void()),
  'token:updated': z.function().args(tokenUpdatedSchema).returns(z.void()),
  'token:deleted': z.function().args(tokenDeletedSchema).returns(z.void()),
  // Actor events
  'actor:created': z.function().args(actorCreatedSchema).returns(z.void()),
  'actor:updated': z.function().args(actorUpdatedSchema).returns(z.void()),
  'actor:deleted': z.function().args(actorDeletedSchema).returns(z.void()),
  // Item events
  'item:created': z.function().args(itemCreatedSchema).returns(z.void()),
  'item:updated': z.function().args(itemUpdatedSchema).returns(z.void()),
  'item:deleted': z.function().args(itemDeletedSchema).returns(z.void())
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
  // Encounter events - room management now handled via session rooms
  'token:move': z.function().args(...tokenMoveArgsSchema.items).returns(z.void()),
  'token:create': z.function().args(...tokenCreateArgsSchema.items).returns(z.void()),
  'token:update': z.function().args(...tokenUpdateArgsSchema.items).returns(z.void()),
  'token:delete': z.function().args(...tokenDeleteArgsSchema.items).returns(z.void()),
  // Actor events (with callbacks)
  'actor:list': z.function().args(...actorListArgsSchema.items).returns(z.void()),
  'actor:get': z.function().args(...actorGetArgsSchema.items).returns(z.void()),
  'actor:update': z.function().args(...actorUpdateArgsSchema.items).returns(z.void()),
  'actor:delete': z.function().args(...actorDeleteArgsSchema.items).returns(z.void()),
  // Item events (with callbacks)
  'item:list': z.function().args(...itemListArgsSchema.items).returns(z.void()),
  'item:get': z.function().args(...itemGetArgsSchema.items).returns(z.void()),
  'item:create': z.function().args(...itemCreateArgsSchema.items).returns(z.void()),
  'item:update': z.function().args(...itemUpdateArgsSchema.items).returns(z.void()),
  'item:delete': z.function().args(...itemDeleteArgsSchema.items).returns(z.void())
});

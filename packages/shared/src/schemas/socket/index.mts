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
  userLeftSessionSchema
} from './chat.mjs';

import {
  rollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  rollCallbackSchema
} from './dice.mjs';

import {
  moveMessageSchema
} from './movement.mjs';

import {
  pluginActionCallbackSchema,
  pluginStateUpdateSchema
} from './plugins.mjs';

import {
  mapGenerationResponseSchema,
  mapEditResponseSchema,
  mapFeatureDetectionResponseSchema,
  workflowProgressCallbackSchema,
  workflowStateSchema,
  mapGenerationRequestSchema,
  mapEditRequestSchema,
  mapFeatureDetectionRequestSchema
} from './workflows.mjs';

import {
  encounterEventSchema,
  encounterStartRequestSchema,
  encounterStopRequestSchema
} from './encounter-events.mjs';

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
  
  // Dice schemas
  rollResultSchema,
  diceRollRequestSchema,
  diceRollResponseSchema,
  rollRequestSchema,
  rollResponseSchema,
  rollCallbackSchema,
  
  // Movement schemas
  moveMessageSchema,
  
  // Plugin schemas
  pluginActionCallbackSchema,
  pluginStateUpdateSchema,
  
  // Workflow schemas
  mapGenerationResponseSchema,
  mapEditResponseSchema,
  mapFeatureDetectionResponseSchema,
  workflowProgressCallbackSchema,
  workflowStateSchema,
  mapGenerationRequestSchema,
  mapEditRequestSchema,
  mapFeatureDetectionRequestSchema,
  
  // Encounter event schemas
  encounterEventSchema,
  encounterStartRequestSchema,
  encounterStopRequestSchema
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
  'encounter:start': z.function().args(encounterEventSchema).returns(z.void()),
  'encounter:stop': z.function().args(encounterEventSchema).returns(z.void()),
  userJoinedSession: z.function().args(userJoinedSessionSchema).returns(z.void()),
  userLeftSession: z.function().args(userLeftSessionSchema).returns(z.void()),
  'workflow:progress:generate-map': workflowProgressCallbackSchema,
  'workflow:state:generate-map': z.function().args(workflowStateSchema).returns(z.void()),
  'workflow:progress:edit-map': workflowProgressCallbackSchema,
  'workflow:state:edit-map': z.function().args(workflowStateSchema).returns(z.void()),
  'workflow:progress:detect-map-features': workflowProgressCallbackSchema,
  'workflow:state:detect-map-features': z.function().args(workflowStateSchema).returns(z.void()),
  'chatbot:typing': z.function().args(chatbotTypingSchema).returns(z.void()),
  'chatbot:typing-stop': z.function().args(chatbotTypingStopSchema).returns(z.void()),
  'chatbot:response': z.function().args(chatbotResponseSchema).returns(z.void()),
  'chatbot:error': z.function().args(chatbotErrorSchema).returns(z.void())
});

export const clientToServerEvents = z.object({
  chat: z.function().args(messageMetadataSchema, z.string(/*message*/)).returns(z.void()),
  joinSession: z
    .function()
    .args(
      z.string(/*sessionId*/),
      z.string(/*actorId*/).optional(),
      z.function().args(joinCallbackSchema)
    )
    .returns(z.void()),
  leaveSession: z.function().args(z.string(/*sessionId*/)).returns(z.void()),
  pluginAction: z
    .function()
    .args(
      z.string(/*pluginId*/),
      z.record(z.string(), z.unknown()),
      z.function().args(pluginActionCallbackSchema)
    )
    .returns(z.void()),
  diceRoll: z.function().args(diceRollRequestSchema).returns(z.void()),
  roll: z
    .function()
    .args(
      rollRequestSchema,
      z.function().args(rollCallbackSchema)
    )
    .returns(z.void()),
  move: z.function().args(moveMessageSchema).returns(z.void()),
  'encounter:start': z.function().args(encounterStartRequestSchema).returns(z.void()),
  'encounter:stop': z.function().args(encounterStopRequestSchema).returns(z.void()),
  'map:generate': z
    .function()
    .args(
      mapGenerationRequestSchema,
      z.function().args(mapGenerationResponseSchema)
    )
    .returns(z.void()),
  'map:edit': z
    .function()
    .args(
      mapEditRequestSchema,
      z.function().args(mapEditResponseSchema)
    )
    .returns(z.void()),
  'map:detect-features': z
    .function()
    .args(
      mapFeatureDetectionRequestSchema,
      z.function().args(mapFeatureDetectionResponseSchema)
    )
    .returns(z.void())
});

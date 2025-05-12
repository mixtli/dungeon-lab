import { z } from 'zod';
import { gameSessionResponseSchema } from '../game-session.schema.mjs';

export const messageParticipantSchema = z.object({
  type: z.enum(['user', 'system', 'actor', 'session']),
  id: z.string().optional()
});

export const messageMetadataSchema = z.object({
  sender: messageParticipantSchema,
  recipient: messageParticipantSchema,
  timestamp: z.date().optional()
});

export const joinCallbackSchema = z.object({
  success: z.boolean(),
  data: gameSessionResponseSchema.optional(),
  error: z.string().optional()
});

export const pluginActionCallbackSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional()
});

export const mapGenerationResponseSchema = z.object({
  success: z.boolean(),
  flowRunId: z.string(),
  error: z.string().optional()
});

export const mapEditResponseSchema = z.object({
  success: z.boolean(),
  flowRunId: z.string(),
  error: z.string().optional()
});

export const workflowProgressCallbackSchema = z
  .function()
  .args(
    z.object({
      flow: z.string(),
      flowRun: z.string(),
      userId: z.string(),
      status: z.string(),
      progress: z.number(),
      message: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  )
  .returns(z.void());

export const rollResultSchema = z.object({
  formula: z.string(),
  rolls: z.array(
    z.object({
      die: z.number(),
      result: z.number()
    })
  ),
  total: z.number(),
  modifier: z.number().optional(),
  userId: z.string()
});

export const moveMessageSchema = z.object({
  gameSessionId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional()
  }),
  actorId: z.string()
});

export const encounterEventSchema = z.object({
  encounterId: z.string(),
  campaignId: z.string(),
  timestamp: z.date()
});

export const serverToClientEvents = z.object({
  chat: z.function().args(messageMetadataSchema, z.string(/* message */)).returns(z.void()),
  error: z.function().args(z.string()).returns(z.void()),
  diceRoll: z
    .function()
    .args(
      z.object({
        formula: z.string(),
        gameSessionId: z.string().optional(),
        result: rollResultSchema,
        userId: z.string()
      })
    )
    .returns(z.void()),
  'roll-result': z
    .function()
    .args(
      z.object({
        type: z.literal('roll-result'),
        result: rollResultSchema,
        gameSessionId: z.string()
      })
    )
    .returns(z.void()),
  move: z.function().args(moveMessageSchema).returns(z.void()),
  pluginStateUpdate: z
    .function()
    .args(
      z.object({
        pluginId: z.string(),
        type: z.string(),
        state: z.record(z.string(), z.unknown())
      })
    )
    .returns(z.void()),
  'encounter:start': z.function().args(encounterEventSchema).returns(z.void()),
  'encounter:stop': z.function().args(encounterEventSchema).returns(z.void()),
  userJoinedSession: z
    .function()
    .args(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
        actorId: z.string().optional()
      })
    )
    .returns(z.void()),
  userLeftSession: z
    .function()
    .args(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
        actorIds: z.array(z.string()),
        characterNames: z.array(z.string())
      })
    )
    .returns(z.void()),
  'workflow:progress:generate-map': workflowProgressCallbackSchema,
  'workflow:state:generate-map': z
    .function()
    .args(
      z.object({
        flow: z.string(),
        flowRun: z.string(),
        userId: z.string(),
        state: z.string(),
        result: z.record(z.string(), z.unknown()).optional()
      })
    )
    .returns(z.void()),
  'workflow:progress:edit-map': workflowProgressCallbackSchema,
  'workflow:state:edit-map': z
    .function()
    .args(
      z.object({
        flow: z.string(),
        flowRun: z.string(),
        userId: z.string(),
        state: z.string(),
        result: z.record(z.string(), z.unknown()).optional()
      })
    )
    .returns(z.void())
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
  diceRoll: z
    .function()
    .args(
      z.object({
        formula: z.string(),
        gameSessionId: z.string().optional()
      })
    )
    .returns(z.void()),
  roll: z
    .function()
    .args(
      z.object({
        formula: z.string(),
        gameSessionId: z.string()
      }),
      z.function().args(z.object({ success: z.boolean(), error: z.string().optional() }))
    )
    .returns(z.void()),
  move: z.function().args(moveMessageSchema).returns(z.void()),
  'encounter:start': z
    .function()
    .args(
      z.object({
        sessionId: z.string(),
        encounterId: z.string(),
        campaignId: z.string()
      })
    )
    .returns(z.void()),
  'encounter:stop': z
    .function()
    .args(
      z.object({
        sessionId: z.string(),
        encounterId: z.string(),
        campaignId: z.string()
      })
    )
    .returns(z.void()),
  'map:generate': z
    .function()
    .args(
      z.object({
        description: z.string(),
        parameters: z.object({
          width: z.number(),
          height: z.number(),
          style: z.string(),
          pixelsPerGrid: z.number(),
          name: z.string()
        })
      }),
      z.function().args(mapGenerationResponseSchema)
    )
    .returns(z.void()),
  'map:edit': z
    .function()
    .args(
      z.object({
        originalImageUrl: z.string(),
        editPrompt: z.string(),
        parameters: z.object({
          width: z.number(),
          height: z.number(),
          style: z.string(),
          pixelsPerGrid: z.number(),
          name: z.string()
        })
      }),
      z.function().args(mapEditResponseSchema)
    )
    .returns(z.void())
});

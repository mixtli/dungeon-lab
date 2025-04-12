import { z } from 'zod';

// Base message schema that all messages will extend
export const baseMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.date(), // Keep this as it's a message timestamp, not a Mongoose timestamp
  sender: z.string(),
  gameSessionId: z.string(),
  pluginId: z.string().optional(), // Plugin that should handle this message
  recipient: z.union([
    z.literal('all'),  // Message to all participants
    z.literal('gm'),   // Message only to game master
    z.literal('server'), // Message only to server
    z.string()      // Direct message to specific user
  ]),
});

// Chat message schema (core system)
export const chatMessageSchema = baseMessageSchema.extend({
  type: z.literal('chat'),
  data: z.object({
    content: z.string(),
    isEmote: z.boolean().default(false),
    isWhisper: z.boolean().default(false),
    displayName: z.string().optional(),
  }),
});

// Dice roll message schema (core system)
export const diceRollMessageSchema = baseMessageSchema.extend({
  type: z.literal('roll-dice'),
  data: z.object({
    formula: z.string(), // e.g. "2d6+3"
    reason: z.string().optional(),
    isSecret: z.boolean().default(false),
  }),
});

// Move token message schema (core system)
export const moveTokenMessageSchema = baseMessageSchema.extend({
  type: z.literal('move-token'),
  data: z.object({
    tokenId: z.string(),
    x: z.number(),
    y: z.number(),
    rotation: z.number().default(0),
  }),
});

// Combat action message schema (core system)
export const combatActionMessageSchema = baseMessageSchema.extend({
  type: z.literal('combat-action'),
  data: z.object({
    actionType: z.enum(['attack', 'cast', 'use', 'other']),
    sourceId: z.string(), // Actor/token performing the action
    targetIds: z.array(z.string()), // Actors/tokens targeted by the action
    actionData: z.record(z.string(), z.unknown()), // Action-specific data
  }),
});

// Plugin message schema (for custom plugin messages)
export const pluginMessageSchema = baseMessageSchema.extend({
  type: z.literal('plugin'),
  data: z.record(z.string(), z.unknown()), // Plugin-specific data
});

// Move message schema (core system)
export const moveMessageSchema = baseMessageSchema.extend({
  type: z.literal('move'),
  data: z.object({
    actorId: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    // Optional fields for advanced movement
    rotation: z.number().optional(), // in degrees
    elevation: z.number().optional(), // in units
  }),
});

// Plugin action message schema (plugin system)
export const pluginActionMessageSchema = baseMessageSchema.extend({
  type: z.literal('plugin-action'),
  pluginId: z.string(), // Required for plugin actions
  data: z.object({
    actionType: z.string(),
    actorId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

// Game state update message schema (core system)
export const gameStateUpdateMessageSchema = baseMessageSchema.extend({
  type: z.literal('game-state-update'),
  data: z.object({
    actors: z.record(z.string(), z.unknown()).optional(),
    items: z.record(z.string(), z.unknown()).optional(),
    maps: z.record(z.string(), z.unknown()).optional(),
    turn: z.object({
      round: z.number(),
      actorId: z.string().optional(),
    }).optional(),
  }),
});

// Plugin state update message schema (plugin system)
export const pluginStateUpdateMessageSchema = baseMessageSchema.extend({
  type: z.literal('plugin-state-update'),
  pluginId: z.string(), // Required for plugin state updates
  data: z.record(z.string(), z.unknown()),
});

// Roll result for a single die
export const DieRollResult = z.object({
  die: z.number(), // The type of die (e.g., 8 for d8)
  result: z.number() // The actual roll result
});

// Complete roll result including all dice and modifiers
export const RollResult = z.object({
  formula: z.string(), // The original formula (e.g., "3d8+2")
  rolls: z.array(DieRollResult), // Individual die results
  modifier: z.number(), // The static modifier (e.g., +2)
  total: z.number(), // The final total
  userId: z.string(), // Who made the roll
  timestamp: z.date()
});

// Command message for rolling dice
export const RollCommandMessage = z.object({
  type: z.literal('roll-command'),
  formula: z.string(), // The dice formula to roll
  gameSessionId: z.string()
});

// Chat message for displaying roll results
export const RollResultMessage = z.object({
  type: z.literal('roll-result'),
  result: RollResult,
  gameSessionId: z.string()
});

// Union of all message types
export const messageSchema = z.discriminatedUnion('type', [
  chatMessageSchema,
  diceRollMessageSchema,
  moveTokenMessageSchema,
  combatActionMessageSchema,
  moveMessageSchema,
  pluginActionMessageSchema,
  gameStateUpdateMessageSchema,
  pluginStateUpdateMessageSchema,
  pluginMessageSchema,
  RollCommandMessage,
  RollResultMessage,
]);

// Export inferred types
export type IBaseMessage = z.infer<typeof baseMessageSchema>;
export type IChatMessage = z.infer<typeof chatMessageSchema>;
export type IDiceRollMessage = z.infer<typeof diceRollMessageSchema>;
export type IMoveTokenMessage = z.infer<typeof moveTokenMessageSchema>;
export type ICombatActionMessage = z.infer<typeof combatActionMessageSchema>;
export type IMoveMessage = z.infer<typeof moveMessageSchema>;
export type IPluginActionMessage = z.infer<typeof pluginActionMessageSchema>;
export type IGameStateUpdateMessage = z.infer<typeof gameStateUpdateMessageSchema>;
export type IPluginStateUpdateMessage = z.infer<typeof pluginStateUpdateMessageSchema>;
export type IPluginMessage = z.infer<typeof pluginMessageSchema>;
export type IMessage = z.infer<typeof messageSchema>;
export type IDieRollResult = z.infer<typeof DieRollResult>;
export type IRollResult = z.infer<typeof RollResult>;
export type IRollCommandMessage = z.infer<typeof RollCommandMessage>;
export type IRollResultMessage = z.infer<typeof RollResultMessage>; 
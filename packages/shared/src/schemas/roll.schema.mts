import { z } from 'zod';
import { baseSocketCallbackSchema } from './socket/base-callback.schema.mjs';

// Roll (Client → Server) - What client sends to initiate a roll
export const rollSchema = z.object({
  id: z.string(),
  rollType: z.string(),
  pluginId: z.string(),
  
  // What server actually needs to process
  dice: z.array(z.object({
    sides: z.number(),
    quantity: z.number()
  })),
  recipients: z.enum(['public', 'private', 'gm']),
  
  // User-configurable arguments (from roll dialog)
  arguments: z.object({
    customModifier: z.number(),
    pluginArgs: z.record(z.unknown()).optional()
  }),
  
  // Plugin-calculated modifiers (automatic from character stats)
  modifiers: z.array(z.object({
    type: z.string(),
    value: z.number(),
    source: z.string()
  })),
  
  // Display metadata (for chat cards and UI)
  metadata: z.object({
    title: z.string(),
    description: z.string().optional(),
    characterName: z.string().optional(),
  }).passthrough()
});

// RollServerResult (Server → Client) - What server sends back with dice results
export const rollServerResultSchema = rollSchema.extend({
  results: z.array(z.object({
    sides: z.number(),
    quantity: z.number(),
    results: z.array(z.number())
  })),
  userId: z.string(),
  timestamp: z.date()
});

// RollFinalResult (Client calculated) - What client creates for display
export const rollFinalResultSchema = rollServerResultSchema.extend({
  total: z.number()
});

// Roll callback schema
export const rollCallbackSchema = baseSocketCallbackSchema;

// Roll args schema for client-to-server events
export const rollArgsSchema = z.tuple([
  rollSchema,
  z.function().args(rollCallbackSchema)
]);

// Roll Request (GM → Player) - Damage roll request from GM to specific player
export const rollRequestSchema = z.object({
  /** Unique identifier for this roll request */
  requestId: z.string(),
  /** Message to display to the player */
  message: z.string(),
  /** Type of roll being requested */
  rollType: z.string(),
  /** Dice to roll as array (e.g., [{sides: 12, quantity: 1}]) */
  dice: z.array(z.object({
    sides: z.number(),
    quantity: z.number()
  })),
  /** Additional metadata to include with the roll */
  metadata: z.record(z.unknown()).optional(),
  /** Target player ID who should make this roll */
  playerId: z.string().optional()
});

export type Roll = z.infer<typeof rollSchema>;
export type RollServerResult = z.infer<typeof rollServerResultSchema>;
export type RollFinalResult = z.infer<typeof rollFinalResultSchema>;
export type RollCallback = z.infer<typeof rollCallbackSchema>;
export type RollRequest = z.infer<typeof rollRequestSchema>;
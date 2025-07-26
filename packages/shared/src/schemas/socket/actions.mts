import { z } from 'zod';

/**
 * Generic action request schema for server-agnostic game action routing.
 * 
 * The server validates only the envelope structure and routes the entire message
 * to the GM client. The GM client (with plugin) validates and processes the
 * opaque payload according to game-specific rules.
 * 
 * This maintains true server agnosticism - the server never understands what
 * specific game actions mean or how to validate their game logic.
 */
export const gameActionRequestSchema = z.object({
  /** Unique identifier for this action request */
  actionId: z.string(),
  
  /** ID of the player making the request */
  playerId: z.string(),
  
  /** ID of the session/game where this action occurs */
  sessionId: z.string(),
  
  /** Timestamp when the action was requested */
  timestamp: z.number(),
  
  /** ID of the plugin that handles this action type */
  pluginId: z.string(),
  
  /** 
   * String identifier for the action type (e.g., "attack", "cast_spell", "skill_check").
   * The server doesn't validate specific values - the plugin defines what's valid.
   */
  actionType: z.string(),
  
  /** 
   * Opaque payload containing game-specific action data.
   * The server never inspects or validates this - it's passed through unchanged
   * to the GM client where the plugin handles validation and processing.
   */
  payload: z.unknown()
});

/**
 * Generic action result schema for GM responses to player actions.
 * 
 * The server routes these results back to players without understanding
 * the game semantics of the result data.
 */
export const gameActionResultSchema = z.object({
  /** ID of the original action this result responds to */
  actionId: z.string(),
  
  /** Whether the action was approved, rejected, or modified by the GM */
  status: z.enum(['approved', 'rejected', 'modified']),
  
  /** 
   * Opaque result data from the GM/plugin processing.
   * May contain state changes, calculated outcomes, error messages, etc.
   * Server doesn't validate the contents.
   */
  result: z.unknown().optional(),
  
  /** Optional human-readable reason for rejection or modification */
  reason: z.string().optional(),
  
  /** Timestamp when the GM made the decision */
  timestamp: z.number()
});

/**
 * Action queue entry schema for managing actions during GM disconnection.
 * 
 * When the GM is disconnected, the server queues action requests without
 * understanding their contents, then delivers them when the GM reconnects.
 */
export const queuedActionSchema = z.object({
  /** The original action request */
  actionRequest: gameActionRequestSchema,
  
  /** When this action was queued */
  queuedAt: z.number(),
  
  /** Current status in the queue */
  queueStatus: z.enum(['queued', 'processing', 'stale']),
  
  /** Optional priority for queue processing */
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});

// Type exports for TypeScript consumers
export type GameActionRequest = z.infer<typeof gameActionRequestSchema>;
export type GameActionResult = z.infer<typeof gameActionResultSchema>;
export type QueuedAction = z.infer<typeof queuedActionSchema>;
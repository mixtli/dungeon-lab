import { z } from 'zod';

/**
 * State operation types for modifying game state
 * Based on MongoDB update operations for consistency
 */
export const StateOperationType = z.enum([
  'set',    // Set field value: { path: "characters.0.hitPoints", operation: "set", value: 45 }
  'unset',  // Remove field: { path: "characters.0.tempHP", operation: "unset" }
  'inc',    // Increment number: { path: "characters.0.experience", operation: "inc", value: 100 }
  'push',   // Add to array: { path: "characters.0.inventory", operation: "push", value: newItem }
  'pull'    // Remove from array: { path: "characters.0.conditions", operation: "pull", value: "poisoned" }
]);

/**
 * Individual state operation
 * Represents a single atomic change to the game state
 */
export const stateOperationSchema = z.object({
  path: z.string(),                           // JSONPath within gameState: "characters.0.pluginData.hitPoints"
  operation: StateOperationType,               // Type of operation to perform
  value: z.unknown().optional(),               // Value for the operation (not needed for 'unset')
  previous: z.unknown().optional()             // Previous value (for rollbacks - set by server)
});

/**
 * Complete state update request
 * Contains multiple operations that should be applied atomically
 */
export const stateUpdateSchema = z.object({
  id: z.string(),                             // Unique ID for this update request
  gameStateId: z.string(),                    // GameState document ID this update applies to
  version: z.string(),                        // Current state version (for optimistic concurrency)
  operations: z.array(stateOperationSchema).min(1), // Array of operations to apply
  timestamp: z.number(),                      // Client timestamp when update was created
  source: z.enum(['gm', 'system']) // Source of the update
});

/**
 * Server response to state update request
 */
export const stateUpdateResponseSchema = z.object({
  success: z.boolean(),
  newVersion: z.string().optional(),           // New state version if successful
  newHash: z.string().optional(),             // New state hash if successful
  error: z.object({
    code: z.enum([
      'VERSION_CONFLICT',                      // Client version doesn't match server
      'VALIDATION_ERROR',                      // State operation failed validation
      'TRANSACTION_FAILED',                    // Database transaction failed
      'GAMESTATE_NOT_FOUND',                   // Game state doesn't exist
      'PERMISSION_DENIED'                      // User lacks permission for this operation
    ]),
    message: z.string(),
    currentVersion: z.string().optional(),     // Current server version for conflict resolution
    currentHash: z.string().optional()        // Current server hash for conflict resolution
  }).optional()
});

/**
 * State update broadcast to clients
 * Sent to all clients when server successfully applies an update
 */
export const stateUpdateBroadcastSchema = z.object({
  gameStateId: z.string(),                     // GameState document ID that was updated
  operations: z.array(stateOperationSchema),
  newVersion: z.string(),
  expectedHash: z.string(),                    // Hash clients should have after applying operations
  timestamp: z.number(),                       // Server timestamp when update was applied
  source: z.enum(['gm', 'system'])
});

// Export types
export type StateOperation = z.infer<typeof stateOperationSchema>;
export type StateUpdate = z.infer<typeof stateUpdateSchema>;
export type StateUpdateResponse = z.infer<typeof stateUpdateResponseSchema>;
export type StateUpdateBroadcast = z.infer<typeof stateUpdateBroadcastSchema>;
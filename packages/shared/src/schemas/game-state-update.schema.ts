import { z } from 'zod';

/**
 * JSON Patch operation types
 * Based on RFC 6902 JSON Patch standard
 */
export const JsonPatchOperationType = z.enum([
  'add',      // Add a value: { op: "add", path: "/documents/character1/hitPoints", value: 45 }
  'remove',   // Remove a value: { op: "remove", path: "/documents/character1/tempHP" }
  'replace',  // Replace a value: { op: "replace", path: "/documents/character1/experience", value: 100 }
  'move',     // Move a value: { op: "move", from: "/documents/character1/items/0", path: "/documents/character2/items/-" }
  'copy',     // Copy a value: { op: "copy", from: "/documents/character1/stats", path: "/documents/character1/backupStats" }
  'test'      // Test a value: { op: "test", path: "/documents/character1/hitPoints", value: 45 }
]);

/**
 * Individual JSON Patch operation
 * Represents a single atomic change to the game state using RFC 6902 JSON Patch format
 */
export const jsonPatchOperationSchema = z.object({
  op: JsonPatchOperationType,                  // Type of operation to perform
  path: z.string(),                           // JSON Pointer within gameState: "/documents/character1/pluginData/hitPoints"
  value: z.unknown().optional(),               // Value for the operation (not needed for 'remove' and 'test')
  from: z.string().optional(),                 // Source path for 'move' and 'copy' operations
  previous: z.unknown().optional()             // Previous value (for rollbacks - set by server)
});

// Legacy type alias for backwards compatibility during migration
export const stateOperationSchema = jsonPatchOperationSchema;

/**
 * Complete state update request
 * Contains multiple JSON Patch operations that should be applied atomically
 */
export const stateUpdateSchema = z.object({
  id: z.string(),                             // Unique ID for this update request
  gameStateId: z.string(),                    // GameState document ID this update applies to
  version: z.string(),                        // Current state version (for optimistic concurrency)
  operations: z.array(jsonPatchOperationSchema).min(1), // Array of JSON Patch operations to apply
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
  operations: z.array(jsonPatchOperationSchema),
  newVersion: z.string(),
  expectedHash: z.string(),                    // Hash clients should have after applying operations
  timestamp: z.number(),                       // Server timestamp when update was applied
  source: z.enum(['gm', 'system'])
});

// Export types
export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type StateOperation = JsonPatchOperation; // Legacy alias
export type StateUpdate = z.infer<typeof stateUpdateSchema>;
export type StateUpdateResponse = z.infer<typeof stateUpdateResponseSchema>;
export type StateUpdateBroadcast = z.infer<typeof stateUpdateBroadcastSchema>;
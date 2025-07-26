import { z } from 'zod';

/**
 * GM authority validation schema for server-level operations.
 * 
 * The server validates GM authority for infrastructure operations but does
 * not validate game logic decisions - those are the GM's prerogative.
 */
export const gmAuthorityRequestSchema = z.object({
  /** ID of the user claiming GM authority */
  gmId: z.string(),
  
  /** Session where GM authority is being exercised */
  sessionId: z.string(),
  
  /** Type of operation requiring GM authority */
  operationType: z.enum([
    'session_control',     // Start/pause/end session
    'player_management',   // Add/remove players, set permissions
    'infrastructure',      // Map changes, asset management
    'message_routing'      // Manage action queues, broadcast settings
  ]),
  
  /** Timestamp of the authority request */
  timestamp: z.number()
});

/**
 * GM disconnection status schema for tracking connection state.
 * 
 * The server monitors GM connection status for action queue management
 * without understanding the queued actions' game semantics.
 */
export const gmConnectionStatusSchema = z.object({
  /** ID of the GM user */
  gmId: z.string(),
  
  /** Current connection status */
  status: z.enum(['connected', 'disconnected', 'reconnecting']),
  
  /** Session ID where this GM is active */
  sessionId: z.string(),
  
  /** When the status changed */
  statusChangedAt: z.number(),
  
  /** If disconnected, when the disconnection was detected */
  disconnectedAt: z.number().optional(),
  
  /** Number of queued actions waiting for GM reconnection */
  queuedActionCount: z.number().default(0)
});

/**
 * Action queue management schema for server-side queue operations.
 * 
 * The server manages action queues during GM disconnection without
 * understanding what the queued actions contain.
 */
export const actionQueueOperationSchema = z.object({
  /** Session where queue operation occurs */
  sessionId: z.string(),
  
  /** Type of queue operation */
  operation: z.enum([
    'queue_action',        // Add action to queue
    'flush_queue',         // Send all queued actions to GM
    'clear_queue',         // Remove all queued actions
    'update_priority',     // Change queue priority
    'remove_stale'         // Remove old queued actions
  ]),
  
  /** ID of action being operated on (for single-action operations) */
  actionId: z.string().optional(),
  
  /** New priority level (for priority updates) */
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  
  /** Reason for queue operation */
  reason: z.string().optional(),
  
  /** Timestamp of the operation */
  timestamp: z.number()
});

/**
 * Message routing status schema for tracking action delivery.
 * 
 * The server tracks message routing without understanding message contents.
 */
export const messageRoutingStatusSchema = z.object({
  /** ID of the message being routed */
  messageId: z.string(),
  
  /** Type of message routing */
  routingType: z.enum([
    'player_to_gm',        // Player action → GM client
    'gm_to_player',        // GM result → Player client
    'gm_to_session',       // GM update → All players
    'session_broadcast'    // System update → All participants
  ]),
  
  /** Current routing status */
  status: z.enum(['pending', 'delivered', 'failed', 'timeout']),
  
  /** Source user ID */
  fromUserId: z.string(),
  
  /** Target user ID or session ID */
  toTarget: z.string(),
  
  /** When routing was attempted */
  routedAt: z.number(),
  
  /** When message was delivered (if successful) */
  deliveredAt: z.number().optional(),
  
  /** Error information (if failed) */
  error: z.string().optional()
});

/**
 * GM session control schema for managing session lifecycle.
 * 
 * These are infrastructure operations that the server understands and validates.
 */
export const gmSessionControlSchema = z.object({
  /** GM performing the control operation */
  gmId: z.string(),
  
  /** Session being controlled */
  sessionId: z.string(),
  
  /** Control operation being performed */
  operation: z.enum([
    'start_session',       // Begin active gameplay
    'pause_session',       // Temporarily pause
    'resume_session',      // Resume from pause
    'end_session',         // End session and cleanup
    'update_settings',     // Change session configuration
    'manage_players'       // Add/remove/configure players
  ]),
  
  /** Operation-specific data (opaque to server validation) */
  operationData: z.unknown().optional(),
  
  /** Reason for the control action */
  reason: z.string().optional(),
  
  /** Timestamp of the control operation */
  timestamp: z.number()
});

// Type exports for TypeScript consumers
export type GMAuthorityRequest = z.infer<typeof gmAuthorityRequestSchema>;
export type GMConnectionStatus = z.infer<typeof gmConnectionStatusSchema>;
export type ActionQueueOperation = z.infer<typeof actionQueueOperationSchema>;
export type MessageRoutingStatus = z.infer<typeof messageRoutingStatusSchema>;
export type GMSessionControl = z.infer<typeof gmSessionControlSchema>;
import { z } from 'zod';

/**
 * GM heartbeat ping schema for connection monitoring.
 * 
 * The server sends periodic pings to the GM client to detect disconnections.
 * This enables action queuing during GM unavailability.
 */
export const gmHeartbeatPingSchema = z.object({
  /** Session where heartbeat monitoring is active */
  sessionId: z.string(),
  
  /** Unique ID for this ping (to match with pong response) */
  pingId: z.string(),
  
  /** Timestamp when ping was sent by server */
  timestamp: z.number(),
  
  /** Expected response timeout in milliseconds */
  timeoutMs: z.number().default(5000),
  
  /** Sequence number for ordering pings */
  sequence: z.number()
});

/**
 * GM heartbeat pong schema for connection confirmation.
 * 
 * The GM client responds to pings to confirm connectivity and provide
 * status information back to the server.
 */
export const gmHeartbeatPongSchema = z.object({
  /** Session ID (must match the ping) */
  sessionId: z.string(),
  
  /** Ping ID being responded to */
  pingId: z.string(),
  
  /** Timestamp when pong was sent by GM client */
  timestamp: z.number(),
  
  /** Round-trip time calculated by client */
  roundTripMs: z.number(),
  
  /** GM client status information */
  clientStatus: z.object({
    /** Whether GM client is actively processing actions */
    isProcessingActions: z.boolean(),
    
    /** Number of actions currently queued in GM client */
    queuedActionsCount: z.number(),
    
    /** Whether GM interface is focused/visible */
    isInterfaceActive: z.boolean(),
    
    /** Optional status message from GM client */
    statusMessage: z.string().optional()
  })
});

/**
 * Connection timeout detection schema for disconnection events.
 * 
 * Generated when the server detects a GM disconnection based on missed heartbeats.
 */
export const connectionTimeoutSchema = z.object({
  /** Session where timeout occurred */
  sessionId: z.string(),
  
  /** GM user ID that timed out */
  gmId: z.string(),
  
  /** When the timeout was detected */
  timeoutDetectedAt: z.number(),
  
  /** Last successful heartbeat timestamp */
  lastHeartbeatAt: z.number(),
  
  /** How long since last successful heartbeat */
  timeoutDurationMs: z.number(),
  
  /** Number of consecutive missed heartbeats */
  missedHeartbeats: z.number(),
  
  /** Actions that were queued when disconnection detected */
  queuedActionCount: z.number()
});

/**
 * Reconnection event schema for GM reconnection handling.
 * 
 * Generated when a disconnected GM reconnects and queued actions need processing.
 */
export const gmReconnectionSchema = z.object({
  /** Session where reconnection occurred */
  sessionId: z.string(),
  
  /** GM user ID that reconnected */
  gmId: z.string(),
  
  /** When reconnection was established */
  reconnectedAt: z.number(),
  
  /** How long the GM was disconnected */
  disconnectionDurationMs: z.number(),
  
  /** Number of actions that were queued during disconnection */
  queuedActionCount: z.number(),
  
  /** Whether queued actions should be delivered immediately */
  deliverQueuedActions: z.boolean().default(true),
  
  /** Status of the reconnected GM client */
  clientStatus: z.object({
    /** Client version/build information */
    clientVersion: z.string().optional(),
    
    /** Whether client is ready to process actions */
    readyForActions: z.boolean(),
    
    /** Any recovery messages from the client */
    recoveryNotes: z.string().optional()
  })
});

/**
 * Heartbeat configuration schema for adjusting monitoring parameters.
 * 
 * Allows dynamic adjustment of heartbeat timing based on network conditions.
 */
export const heartbeatConfigSchema = z.object({
  /** Session where configuration applies */
  sessionId: z.string(),
  
  /** Interval between heartbeat pings in milliseconds */
  pingIntervalMs: z.number().min(1000).max(30000).default(5000),
  
  /** Timeout for each individual ping response */
  pingTimeoutMs: z.number().min(500).max(10000).default(3000),
  
  /** Number of consecutive missed pings before declaring timeout */
  missedPingThreshold: z.number().min(1).max(10).default(3),
  
  /** Whether to enable adaptive timing based on latency */
  adaptiveTiming: z.boolean().default(false),
  
  /** Maximum ping interval for adaptive timing */
  adaptiveMaxIntervalMs: z.number().optional(),
  
  /** Whether heartbeat monitoring is currently enabled */
  enabled: z.boolean().default(true)
});

/**
 * Network quality metrics schema for connection assessment.
 * 
 * Tracks connection quality to inform heartbeat timing and queue behavior.
 */
export const networkQualitySchema = z.object({
  /** Session being monitored */
  sessionId: z.string(),
  
  /** Average round-trip time over recent heartbeats */
  averageRttMs: z.number(),
  
  /** Current jitter (variation in latency) */
  jitterMs: z.number(),
  
  /** Packet loss percentage (0-100) */
  packetLossPercent: z.number().min(0).max(100),
  
  /** Quality assessment */
  qualityRating: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
  
  /** Whether connection is stable enough for real-time actions */
  isStableConnection: z.boolean(),
  
  /** Recommended action for current network conditions */
  recommendation: z.enum([
    'normal_operation',      // Everything working well
    'increase_tolerance',    // More lenient timeouts needed
    'queue_actions',         // Should queue actions due to instability
    'request_reconnection'   // Connection too poor, need to reconnect
  ]),
  
  /** When these metrics were last updated */
  lastUpdated: z.number()
});

// Type exports for TypeScript consumers
export type GMHeartbeatPing = z.infer<typeof gmHeartbeatPingSchema>;
export type GMHeartbeatPong = z.infer<typeof gmHeartbeatPongSchema>;
export type ConnectionTimeout = z.infer<typeof connectionTimeoutSchema>;
export type GMReconnection = z.infer<typeof gmReconnectionSchema>;
export type HeartbeatConfig = z.infer<typeof heartbeatConfigSchema>;
export type NetworkQuality = z.infer<typeof networkQualitySchema>;
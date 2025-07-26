import type { 
  GameActionRequest
} from '@dungeon-lab/shared/schemas/socket/actions.mjs';
import type {
  GMConnectionStatus
} from '@dungeon-lab/shared/schemas/socket/gm-authority.mjs';
import { logger } from '../../utils/logger.mjs';
import type { 
  GMDisconnectionState,
  ActionMessage,
  QueuedAction
} from './types.mjs';

/**
 * Configuration for GM disconnection handling
 */
interface DisconnectionConfig {
  maxMissedHeartbeats: number;
  gracePeriodMs: number;
  maxQueuedActions: number;
  actionTimeoutMs: number;
}

/**
 * Default configuration for GM disconnection handling
 */
const DEFAULT_CONFIG: DisconnectionConfig = {
  maxMissedHeartbeats: 3,
  gracePeriodMs: 30000, // 30 seconds
  maxQueuedActions: 100,
  actionTimeoutMs: 300000 // 5 minutes
};

/**
 * Handles GM disconnection scenarios for GameSession aggregate
 * 
 * Responsibilities:
 * - Track GM connection status and heartbeat monitoring
 * - Queue player actions when GM is disconnected
 * - Manage reconnection scenarios and action replay
 * - Clean up expired actions and maintain queue limits
 */
export class GMDisconnectionHandler {
  private disconnectionState: GMDisconnectionState;
  private config: DisconnectionConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private sessionId: string,
    config: Partial<DisconnectionConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.disconnectionState = {
      isConnected: true,
      queuedActions: [],
      missedHeartbeats: 0,
      connectionStatus: {
        gmId: '',
        status: 'connected',
        sessionId: this.sessionId,
        statusChangedAt: Date.now(),
        queuedActionCount: 0
      }
    };

    this.startCleanupTimer();
  }

  /**
   * Handle GM heartbeat received
   */
  public handleHeartbeat(gmId: string): void {
    const wasDisconnected = !this.disconnectionState.isConnected;
    
    this.disconnectionState.isConnected = true;
    this.disconnectionState.missedHeartbeats = 0;
    this.disconnectionState.connectionStatus = {
      gmId,
      status: 'connected',
      sessionId: this.sessionId,
      statusChangedAt: Date.now(),
      queuedActionCount: this.disconnectionState.queuedActions.length
    };

    if (wasDisconnected) {
      this.disconnectionState.reconnectedAt = Date.now();
      logger.info(`GM reconnected to session ${this.sessionId}`, {
        gmId,
        queuedActions: this.disconnectionState.queuedActions.length,
        disconnectedDuration: this.disconnectionState.disconnectedAt 
          ? Date.now() - this.disconnectionState.disconnectedAt 
          : 0
      });
    }
  }

  /**
   * Handle missed heartbeat from GM
   */
  public handleMissedHeartbeat(gmId: string): void {
    this.disconnectionState.missedHeartbeats++;
    
    if (this.disconnectionState.missedHeartbeats >= this.config.maxMissedHeartbeats) {
      this.markGMDisconnected(gmId);
    } else {
      this.disconnectionState.connectionStatus = {
        ...this.disconnectionState.connectionStatus,
        status: 'reconnecting',
        statusChangedAt: Date.now()
      };
      
      logger.warn(`GM missed heartbeat ${this.disconnectionState.missedHeartbeats}/${this.config.maxMissedHeartbeats}`, {
        sessionId: this.sessionId,
        gmId
      });
    }
  }

  /**
   * Mark GM as disconnected and start queuing actions
   */
  private markGMDisconnected(gmId: string): void {
    if (this.disconnectionState.isConnected) {
      this.disconnectionState.isConnected = false;
      this.disconnectionState.disconnectedAt = Date.now();
      this.disconnectionState.connectionStatus = {
        gmId,
        status: 'disconnected',
        sessionId: this.sessionId,
        statusChangedAt: Date.now(),
        disconnectedAt: Date.now(),
        queuedActionCount: this.disconnectionState.queuedActions.length
      };

      logger.warn(`GM disconnected from session ${this.sessionId}`, {
        gmId,
        missedHeartbeats: this.disconnectionState.missedHeartbeats
      });
    }
  }

  /**
   * Queue a player action when GM is disconnected
   */
  public queueAction(action: GameActionRequest, playerId: string): ActionMessage | null {
    if (this.disconnectionState.isConnected) {
      // GM is connected, don't queue
      return null;
    }

    // Check queue limits
    if (this.disconnectionState.queuedActions.length >= this.config.maxQueuedActions) {
      logger.warn(`Action queue full for session ${this.sessionId}, rejecting action`, {
        playerId,
        actionType: action.actionType,
        queueSize: this.disconnectionState.queuedActions.length
      });
      return null;
    }

    const actionMessage: ActionMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      sessionId: this.sessionId,
      action,
      timestamp: Date.now(),
      status: 'queued'
    };

    // Create queued action for the disconnection state
    const queuedAction: QueuedAction = {
      actionId: actionMessage.id,
      playerId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      pluginId: action.pluginId,
      actionType: action.actionType,
      payload: action.payload,
      queuedAt: Date.now(),
      expiresAt: Date.now() + this.config.actionTimeoutMs
    };

    this.disconnectionState.queuedActions.push(queuedAction);
    
    // Update connection status
    this.disconnectionState.connectionStatus.queuedActionCount = 
      this.disconnectionState.queuedActions.length;

    logger.info(`Action queued for disconnected GM`, {
      sessionId: this.sessionId,
      playerId,
      actionType: action.actionType,
      queueSize: this.disconnectionState.queuedActions.length
    });

    return actionMessage;
  }

  /**
   * Get all queued actions for GM processing
   */
  public getQueuedActions(): QueuedAction[] {
    return [...this.disconnectionState.queuedActions];
  }

  /**
   * Clear queued actions (called after GM processes them)
   */
  public clearQueuedActions(): void {
    const clearedCount = this.disconnectionState.queuedActions.length;
    this.disconnectionState.queuedActions = [];
    this.disconnectionState.connectionStatus.queuedActionCount = 0;

    if (clearedCount > 0) {
      logger.info(`Cleared ${clearedCount} queued actions for session ${this.sessionId}`);
    }
  }

  /**
   * Remove specific action from queue (if processed individually)
   */
  public removeQueuedAction(actionId: string): boolean {
    const initialLength = this.disconnectionState.queuedActions.length;
    this.disconnectionState.queuedActions = this.disconnectionState.queuedActions
      .filter(action => action.actionId !== actionId);
    
    const removed = initialLength > this.disconnectionState.queuedActions.length;
    if (removed) {
      this.disconnectionState.connectionStatus.queuedActionCount = 
        this.disconnectionState.queuedActions.length;
    }
    
    return removed;
  }

  /**
   * Get current GM connection status
   */
  public getConnectionStatus(): GMConnectionStatus {
    return { ...this.disconnectionState.connectionStatus };
  }

  /**
   * Check if GM is currently connected
   */
  public isGMConnected(): boolean {
    return this.disconnectionState.isConnected;
  }

  /**
   * Get disconnection state for aggregate
   */
  public getDisconnectionState(): GMDisconnectionState {
    return { ...this.disconnectionState };
  }

  /**
   * Check if grace period has expired (GM has been disconnected too long)
   */
  public isGracePeriodExpired(): boolean {
    if (this.disconnectionState.isConnected || !this.disconnectionState.disconnectedAt) {
      return false;
    }
    
    return Date.now() - this.disconnectionState.disconnectedAt > this.config.gracePeriodMs;
  }

  /**
   * Start cleanup timer for expired actions
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredActions();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired actions from the queue
   */
  private cleanupExpiredActions(): void {
    const now = Date.now();
    const initialLength = this.disconnectionState.queuedActions.length;
    
    this.disconnectionState.queuedActions = this.disconnectionState.queuedActions
      .filter(action => action.expiresAt > now);
    
    const removedCount = initialLength - this.disconnectionState.queuedActions.length;
    if (removedCount > 0) {
      this.disconnectionState.connectionStatus.queuedActionCount = 
        this.disconnectionState.queuedActions.length;
      
      logger.info(`Cleaned up ${removedCount} expired actions from session ${this.sessionId}`);
    }
  }

  /**
   * Dispose of the handler and clean up resources
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}
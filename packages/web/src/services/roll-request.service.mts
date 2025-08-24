import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { useSocketStore } from '../stores/socket.store.mts';

/**
 * Data structure for roll request parameters
 */
export interface RollData {
  message?: string;
  dice: Array<{ sides: number; quantity: number }>;
  metadata?: Record<string, unknown>;
}

/**
 * Specification for individual roll requests in multi-target scenarios
 */
export interface RollRequestSpec {
  playerId: string;
  rollType: string;
  rollData: RollData;
}

/**
 * Internal tracking structure for pending roll requests
 */
interface PendingRollRequest {
  resolve: (result: RollServerResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  playerId: string;
  rollType: string;
  timestamp: number;
}

/**
 * Service to manage asynchronous roll request/response cycles
 * Handles correlation, timeouts, and error recovery for unified action handlers
 */
export class RollRequestService {
  private pendingRollRequests = new Map<string, PendingRollRequest>();
  private defaultTimeoutMs = 60000; // 60 seconds
  private cleanupIntervalMs = 120000; // 2 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup of expired requests
    this.startCleanupTimer();
  }

  /**
   * Send a roll request and return Promise that resolves with the result
   * 
   * @param playerId - ID of player who should make the roll
   * @param rollType - Type of roll being requested (e.g., 'spell-attack', 'saving-throw')
   * @param rollData - Roll parameters including dice expression and metadata
   * @param timeoutMs - Timeout in milliseconds (default: 60000)
   * @returns Promise that resolves with RollServerResult
   */
  async sendRollRequest(
    playerId: string,
    rollType: string,
    rollData: RollData,
    timeoutMs = this.defaultTimeoutMs
  ): Promise<RollServerResult> {
    console.log('[RollRequestService] Sending roll request:', {
      playerId,
      rollType,
      message: rollData.message,
      timeout: timeoutMs
    });

    // Generate unique request ID with timestamp and random component
    const requestId = this.generateRequestId();
    
    // Get socket store for WebSocket communication
    const socketStore = useSocketStore();
    if (!socketStore.socket || !socketStore.connected) {
      throw new Error('WebSocket not connected - cannot send roll request');
    }

    // Send roll:request via existing WebSocket infrastructure
    // Note: This sends a roll request to a specific player via GM->Player communication
    socketStore.emit('roll:request', {
      id: requestId, // Single ID flows through entire roll lifecycle
      playerId,
      rollType,
      message: rollData.message || `Roll ${rollType}`,
      dice: rollData.dice,
      metadata: rollData.metadata
    });

    // Return promise that resolves when roll:result comes back
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = new Error(`Roll request timeout for player ${playerId} (${rollType})`);
        console.warn('[RollRequestService] Request timed out:', {
          requestId,
          playerId,
          rollType,
          timeoutMs
        });
        
        reject(error);
        this.pendingRollRequests.delete(requestId);
      }, timeoutMs);

      this.pendingRollRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        playerId,
        rollType,
        timestamp: Date.now()
      });

      console.log('[RollRequestService] Request registered with ID:', requestId);
    });
  }

  /**
   * Send multiple roll requests in parallel and await all results
   * Uses Promise.all() for coordination, handles partial failures gracefully
   * 
   * @param requests - Array of roll request specifications
   * @returns Promise that resolves with array of RollServerResults
   */
  async sendMultipleRollRequests(requests: RollRequestSpec[]): Promise<RollServerResult[]> {
    console.log('[RollRequestService] Sending multiple roll requests:', {
      count: requests.length,
      requests: requests.map(r => ({ playerId: r.playerId, rollType: r.rollType }))
    });

    if (requests.length === 0) {
      return [];
    }

    try {
      // Create promises for all roll requests
      const rollPromises = requests.map(req =>
        this.sendRollRequest(req.playerId, req.rollType, req.rollData)
      );

      // Wait for all requests to complete using Promise.all
      const results = await Promise.all(rollPromises);
      
      console.log('[RollRequestService] All roll requests completed successfully:', {
        count: results.length
      });

      return results;

    } catch (error) {
      console.error('[RollRequestService] Error in multi-request coordination:', error);
      
      // Re-throw with additional context for debugging
      const enhancedError = new Error(
        `Multi-roll request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Add cause for debugging (ES2022 feature, may not be available in all environments)
      if ('cause' in Error.prototype) {
        (enhancedError as any).cause = error;
      }
      throw enhancedError;
    }
  }

  /**
   * Handle incoming roll:result events (called by roll handler)
   * Resolves the appropriate pending promise based on roll ID
   * 
   * @param result - Roll result from server
   */
  handleRollResult(result: RollServerResult): void {
    const requestId = result.id;
    
    if (!requestId) {
      console.warn('[RollRequestService] Received roll result without ID:', result);
      return;
    }

    const pendingRequest = this.pendingRollRequests.get(requestId);
    if (!pendingRequest) {
      // This is normal for player-initiated rolls (not GM-requested)
      console.debug('[RollRequestService] Received result for non-requested roll:', requestId);
      return;
    }

    // Calculate total from dice results
    const total = result.results.reduce((sum, diceGroup) => {
      return sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0);
    }, 0);

    console.log('[RollRequestService] Resolving roll request:', {
      requestId,
      playerId: pendingRequest.playerId,
      rollType: pendingRequest.rollType,
      total: total
    });

    // Clear timeout and resolve promise
    clearTimeout(pendingRequest.timeout);
    pendingRequest.resolve(result);
    this.pendingRollRequests.delete(requestId);
  }

  /**
   * Cancel a specific pending roll request
   * Useful for cleanup when action handlers are interrupted
   * 
   * @param requestId - ID of request to cancel
   */
  cancelRequest(requestId: string): void {
    const pendingRequest = this.pendingRollRequests.get(requestId);
    if (pendingRequest) {
      console.log('[RollRequestService] Canceling roll request:', requestId);
      
      clearTimeout(pendingRequest.timeout);
      pendingRequest.reject(new Error('Roll request canceled'));
      this.pendingRollRequests.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests (e.g., when disconnecting)
   * Useful for cleanup during shutdown or major state changes
   */
  cancelAllRequests(): void {
    console.log('[RollRequestService] Canceling all pending requests:', {
      count: this.pendingRollRequests.size
    });

    for (const [, pendingRequest] of this.pendingRollRequests.entries()) {
      clearTimeout(pendingRequest.timeout);
      pendingRequest.reject(new Error('All roll requests canceled'));
    }
    
    this.pendingRollRequests.clear();
  }

  /**
   * Get information about currently pending requests
   * Useful for debugging and monitoring
   */
  getPendingRequestInfo(): Array<{
    requestId: string;
    playerId: string;
    rollType: string;
    ageMs: number;
  }> {
    const now = Date.now();
    return Array.from(this.pendingRollRequests.entries()).map(([requestId, request]) => ({
      requestId,
      playerId: request.playerId,
      rollType: request.rollType,
      ageMs: now - request.timestamp
    }));
  }

  /**
   * Clean up expired requests (called periodically)
   * Prevents memory leaks from requests that never received responses
   */
  cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredRequestIds: string[] = [];

    for (const [requestId, request] of this.pendingRollRequests.entries()) {
      const age = now - request.timestamp;
      
      // Clean up requests older than 2 minutes (beyond any reasonable timeout)
      if (age > this.cleanupIntervalMs) {
        console.warn('[RollRequestService] Cleaning up expired request:', {
          requestId,
          ageMs: age,
          playerId: request.playerId,
          rollType: request.rollType
        });
        
        clearTimeout(request.timeout);
        request.reject(new Error('Request expired during cleanup'));
        expiredRequestIds.push(requestId);
      }
    }

    // Remove expired requests from tracking
    expiredRequestIds.forEach(requestId => {
      this.pendingRollRequests.delete(requestId);
    });

    if (expiredRequestIds.length > 0) {
      console.log('[RollRequestService] Cleaned up expired requests:', {
        count: expiredRequestIds.length
      });
    }
  }

  /**
   * Start periodic cleanup timer
   * Called automatically in constructor
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop cleanup timer and cancel all pending requests
   * Called during service destruction
   */
  destroy(): void {
    console.log('[RollRequestService] Destroying service');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cancelAllRequests();
  }

  /**
   * Generate unique request ID with timestamp and random component
   * Format: roll_{timestamp}_{random9chars}
   * 
   * @returns Unique request ID string
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `roll_${timestamp}_${randomPart}`;
  }
}

// Singleton instance for use throughout the application
export const rollRequestService = new RollRequestService();
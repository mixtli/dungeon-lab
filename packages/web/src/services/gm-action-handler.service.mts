/**
 * GM Action Handler Service
 * 
 * Handles incoming GameActionRequests routed from the server to the GM client.
 * Performs validation and either approves (via gameState:update) or denies requests.
 */

import type { GameActionRequest } from '@dungeon-lab/shared/types/index.mjs';
import type { JsonPatchOperation } from '@dungeon-lab/shared/types/index.mjs';
import { 
  getActionConfig, 
  generateApprovalMessage,
  type ActionConfig
} from './action-config-registry.mts';
import { useChatStore, type ApprovalData } from '../stores/chat.store.mts';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';

/**
 * GM Action Handler Service - processes action requests sent to GM client
 */
export class GMActionHandlerService {
  // Request deduplication to prevent race conditions
  private processedRequests = new Set<string>();
  private requestCleanupTimeout = 30000; // Clean up after 30 seconds

  // Pending approval requests storage
  private pendingRequests = new Map<string, {
    request: GameActionRequest;
    operations: JsonPatchOperation[];
    timestamp: number;
  }>();

  // Lazy-loaded stores to avoid initialization order issues
  private get gameSessionStore() {
    return useGameSessionStore();
  }

  private get socketStore() {
    return useSocketStore();
  }

  private get chatStore() {
    return useChatStore();
  }

  /**
   * Initialize the GM action handler - sets up socket listeners
   */
  init() {
    console.log('[GMActionHandler] Initializing GM action handler');
    
    // Only GMs should handle these requests
    if (!this.gameSessionStore.isGameMaster) {
      return;
    }

    // Listen for action requests routed from server
    this.socketStore.socket?.on('gameAction:forward', this.handleActionRequest.bind(this));
  }

  /**
   * Handle incoming action requests from server
   */
  private handleActionRequest(request: GameActionRequest) {
    console.log('[GMActionHandler] Received action request:', {
      action: request.action,
      playerId: request.playerId,
      requestId: request.id
    });

    // Check for duplicate request to prevent race condition
    if (this.processedRequests.has(request.id)) {
      console.log('[GMActionHandler] Ignoring duplicate request:', request.id);
      return;
    }

    // Mark request as processed
    this.processedRequests.add(request.id);
    
    // Schedule cleanup to prevent memory leaks
    setTimeout(() => {
      this.processedRequests.delete(request.id);
    }, this.requestCleanupTimeout);

    // Route to appropriate handler using registry
    this.handleActionUsingRegistry(request);
  }

  /**
   * Handle action using registry-based approach
   */
  private async handleActionUsingRegistry(request: GameActionRequest) {
    try {
      const config = getActionConfig(request.action);
      
      // Check if action requires approval
      if (config.requiresApproval && !config.autoApprove) {
        console.log('[GMActionHandler] Action requires approval, sending to chat:', request.action);
        await this.sendApprovalRequest(request);
      } else {
        console.log('[GMActionHandler] Auto-executing action:', request.action);
        await this.executeAction(request, config);
      }
    } catch (error) {
      console.error('[GMActionHandler] Error handling action:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'ACTION_HANDLING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Execute an action using its configured handler
   */
  private async executeAction(request: GameActionRequest, config: ActionConfig) {
    try {
      console.log('[GMActionHandler] Executing action with handler:', request.action);
      
      // Call the handler function and get result
      const result = await config.handler(request);
      
      if (result.success) {
        // Send success response
        this.socketStore.emit('gameAction:response', {
          success: true,
          approved: true,
          requestId: request.id
        });
        
        console.log('[GMActionHandler] Action executed successfully:', request.id);
      } else {
        // Send error response based on handler result
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: result.error || {
            code: 'ACTION_FAILED',
            message: 'Action failed without specific error'
          }
        });
        
        console.log('[GMActionHandler] Action failed:', {
          requestId: request.id,
          action: request.action,
          error: result.error
        });
      }
      
    } catch (error) {
      console.error('[GMActionHandler] Error executing action:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'ACTION_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute action'
        }
      });
    }
  }

  /**
   * Send approval request to chat for GM review
   */
  private async sendApprovalRequest(request: GameActionRequest) {
    // Store pending request for later execution
    this.pendingRequests.set(request.id, {
      request,
      operations: [], // Will be populated by handler-specific logic if needed
      timestamp: Date.now()
    });

    // Schedule cleanup after timeout
    setTimeout(() => {
      if (this.pendingRequests.has(request.id)) {
        console.log('[GMActionHandler] Approval request timed out:', request.id);
        this.pendingRequests.delete(request.id);
        
        // Send timeout response
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'APPROVAL_TIMEOUT',
            message: 'Approval request timed out'
          }
        });
      }
    }, this.requestCleanupTimeout);

    // Get player name for display
    const playerName = await this.getPlayerName(request.playerId);

    // Create approval data
    const approvalData: ApprovalData = {
      requestId: request.id,
      actionType: request.action,
      playerName,
      description: generateApprovalMessage(request),
      request
    };

    // Send to chat store for display
    this.chatStore.sendApprovalRequest(approvalData);
    
    console.log('[GMActionHandler] Approval request sent to chat:', request.id);
  }

  /**
   * Public method to approve a pending request
   */
  public async approveRequest(requestId: string): Promise<void> {
    console.log('[GMActionHandler] Approving request:', requestId);
    
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      console.warn('[GMActionHandler] No pending request found for approval:', requestId);
      return;
    }

    // Remove from pending requests
    this.pendingRequests.delete(requestId);

    try {
      // Get the action configuration and execute the handler
      const config = getActionConfig(pendingRequest.request.action);
      await this.executeAction(pendingRequest.request, config);
      
    } catch (error) {
      console.error('[GMActionHandler] Error executing approved request:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: requestId,
        error: {
          code: 'APPROVED_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute approved action'
        }
      });
    }
  }

  /**
   * Public method to deny a pending request
   */
  public async denyRequest(requestId: string, reason?: string): Promise<void> {
    console.log('[GMActionHandler] Denying request:', requestId);
    
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      console.warn('[GMActionHandler] No pending request found for denial:', requestId);
      return;
    }

    // Remove from pending requests
    this.pendingRequests.delete(requestId);

    // Send denial response
    this.socketStore.emit('gameAction:response', {
      success: true,
      approved: false,
      requestId: requestId,
      error: {
        code: 'ACTION_DENIED',
        message: reason || 'Request denied by Game Master'
      }
    });
  }



  /**
   * Get player name by ID for display purposes
   */
  private async getPlayerName(playerId: string): Promise<string> {
    // Try to get from current session participants
    const session = this.gameSessionStore.currentSession;
    if (session) {
      // Check if it's the GM
      if (playerId === session.gameMasterId) {
        return 'Game Master';
      }
      
      // Check characters for the player
      const character = session.characters?.find(c => c.createdBy === playerId);
      if (character) {
        return character.name;
      }
    }
    
    // Fallback to player ID
    return `Player ${playerId.substring(0, 8)}...`;
  }


  /**
   * Cleanup - remove socket listeners
   */
  destroy() {
    console.log('[GMActionHandler] Destroying GM action handler');
    this.socketStore.socket?.off('gameAction:forward');
    
    // Clear pending requests
    this.pendingRequests.clear();
  }
}

// Singleton instance
export const gmActionHandlerService = new GMActionHandlerService();
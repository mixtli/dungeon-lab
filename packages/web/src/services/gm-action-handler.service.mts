/**
 * GM Action Handler Service - Multi-Handler Architecture
 * 
 * Handles incoming GameActionRequests routed from the server to the GM client.
 * Supports multiple handlers per action type with priority-based execution.
 * Uses Immer draft mutation with automatic patch generation.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, JsonPatchOperation } from '@dungeon-lab/shared/types/index.mjs';
import { 
  getHandlers, 
  requiresManualApproval, 
  generateApprovalMessage 
} from './multi-handler-registry.mjs';
import type { ActionHandler } from './action-handler.interface.mjs';
import { createDraft, finishDraft, enablePatches } from 'immer';
import { toRaw } from 'vue';
import { useChatStore, type ApprovalData } from '../stores/chat.store.mts';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';

// Enable Immer patches for automatic patch generation
enablePatches();

/**
 * GM Action Handler Service - processes action requests using multi-handler architecture
 */
export class GMActionHandlerService {
  // Request deduplication to prevent race conditions
  private processedRequests = new Set<string>();
  private requestCleanupTimeout = 30000; // Clean up after 30 seconds

  // Pending approval requests storage
  private pendingRequests = new Map<string, {
    request: GameActionRequest;
    timestamp: number;
  }>();

  // Lazy-loaded stores to avoid initialization order issues
  private get gameSessionStore() {
    return useGameSessionStore();
  }

  private get gameStateStore() {
    return useGameStateStore();
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
    console.log('[GMActionHandler] Initializing GM action handler with multi-handler architecture');
    
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

    // Route to multi-handler processor
    this.handleActionUsingMultiHandler(request);
  }

  /**
   * Handle action using multi-handler architecture
   */
  private async handleActionUsingMultiHandler(request: GameActionRequest) {
    try {
      const handlers = getHandlers(request.action);
      
      if (handlers.length === 0) {
        console.warn('[GMActionHandler] No handlers registered for action:', request.action);
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_HANDLERS',
            message: `No handlers registered for action: ${request.action}`
          }
        });
        return;
      }

      console.log('[GMActionHandler] Found handlers for action:', {
        action: request.action,
        handlerCount: handlers.length,
        handlers: handlers.map(h => ({ pluginId: h.pluginId || 'core', priority: h.priority || 0 }))
      });

      // Check if any handler requires manual approval
      if (requiresManualApproval(request.action)) {
        console.log('[GMActionHandler] Action requires manual approval, sending to chat:', request.action);
        await this.sendApprovalRequest(request);
      } else {
        console.log('[GMActionHandler] Auto-executing action with', handlers.length, 'handlers');
        await this.executeMultiHandlerAction(request, handlers);
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
   * Execute an action using multiple handlers with Immer draft mutation
   */
  private async executeMultiHandlerAction(request: GameActionRequest, handlers: ActionHandler[]) {
    try {
      const currentGameState = this.gameStateStore.gameState;
      
      console.log('[GMActionHandler] Starting multi-handler execution:', {
        action: request.action,
        handlerCount: handlers.length,
        requestId: request.id
      });

      if (!currentGameState) {
        console.error('[GMActionHandler] No game state available');
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_GAME_STATE',
            message: 'No game state available'
          }
        });
        return;
      }

      // Phase 1: Run all validations (fail-fast)
      for (const handler of handlers) {
        if (handler.validate) {
          console.log('[GMActionHandler] Running validation for handler:', {
            pluginId: handler.pluginId || 'core',
            priority: handler.priority || 0
          });
          
          const result = await handler.validate(request, currentGameState as ServerGameStateWithVirtuals);
          if (!result.valid) {
            console.log('[GMActionHandler] Validation failed:', {
              pluginId: handler.pluginId || 'core',
              error: result.error
            });
            
            this.socketStore.emit('gameAction:response', {
              success: false,
              requestId: request.id,
              error: result.error || {
                code: 'VALIDATION_FAILED',
                message: 'Action validation failed'
              }
            });
            return;
          }
        }
      }

      // Phase 2: Execute all handlers using Immer createDraft/finishDraft for async support
      console.log('[GMActionHandler] All validations passed, executing handlers with async Immer draft');
      
      // Extract raw game state to avoid Vue proxy conflicts
      const rawGameState = toRaw(currentGameState);
      
      // Create draft for async operations
      const draft = createDraft(rawGameState);
      
      // Execute all handlers against the draft with proper async support
      for (const handler of handlers) {
        if (handler.execute) {
          console.log('[GMActionHandler] Executing handler:', {
            pluginId: handler.pluginId || 'core',
            priority: handler.priority || 0
          });
          
          try {
            // Properly await async handler execution
            await handler.execute(request, draft as ServerGameStateWithVirtuals);
            
            console.log('[GMActionHandler] Handler executed successfully:', {
              pluginId: handler.pluginId || 'core'
            });
          } catch (error) {
            console.error('[GMActionHandler] Handler execution failed:', {
              pluginId: handler.pluginId || 'core',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Re-throw to fail the entire operation
            throw error;
          }
        }
      }
      
      // Finish draft and collect patches
      let immerPatches: JsonPatchOperation[] = [];
      const finalState = finishDraft(draft, (patches) => {
        // Patch callback - convert Immer patches to our JsonPatchOperation format
        console.log('[GMActionHandler] Immer patches:', patches);
        immerPatches = patches.map(patch => ({
          ...patch,
          path: Array.isArray(patch.path) ? '/' + patch.path.join('/') : patch.path
        }));
      });

      // Phase 3: Apply all patches atomically
      if (immerPatches.length > 0) {
        console.log('[GMActionHandler] Applying Immer-generated patches:', {
          action: request.action,
          patchCount: immerPatches.length,
          requestId: request.id,
          patches: immerPatches
        });
        
        const updateResult = await this.gameStateStore.updateGameState(immerPatches);
        
        if (!updateResult.success) {
          this.socketStore.emit('gameAction:response', {
            success: false,
            requestId: request.id,
            error: {
              code: 'STATE_UPDATE_FAILED',
              message: updateResult.error?.message || 'Failed to apply state changes'
            }
          });
          
          console.error('[GMActionHandler] State update failed:', {
            requestId: request.id,
            action: request.action,
            error: updateResult.error
          });
          return;
        }
      } else {
        console.log('[GMActionHandler] No state changes generated by handlers');
      }
      
      // Send success response
      this.socketStore.emit('gameAction:response', {
        success: true,
        approved: true,
        requestId: request.id
      });
      
      console.log('[GMActionHandler] Multi-handler action executed successfully:', {
        requestId: request.id,
        action: request.action,
        handlersExecuted: handlers.length,
        patchesApplied: immerPatches.length
      });
      
    } catch (error) {
      console.error('[GMActionHandler] Error executing multi-handler action:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'EXECUTION_ERROR',
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
      description: await generateApprovalMessage(request.action, request),
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
      // Get handlers and execute the action
      const handlers = getHandlers(pendingRequest.request.action);
      await this.executeMultiHandlerAction(pendingRequest.request, handlers);
      
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
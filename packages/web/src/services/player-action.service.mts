/**
 * Player Action Service
 * 
 * Handles the request/approval workflow for player actions in the VTT.
 * Implements the GameActionRequest architecture by sending all requests
 * to the GM client for validation via socket communication.
 */

import { 
  type GameActionRequest, 
  type ActionRequestResult,
  type GameActionType,
  type ActionRequestResponse
} from '@dungeon-lab/shared/types/index.mjs';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import { useAuthStore } from '../stores/auth.store.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';
import { turnManagerService } from './turn-manager.service.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { getHandlers } from './multi-handler-registry.mjs';
import type { ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validate action using the same handlers as the server
 * This provides client-side optimization while maintaining consistency
 */
function validateActionClientSide(
  action: GameActionType,
  parameters: Record<string, unknown>,
  gameState: any,
  playerId: string
): ActionValidationResult | null {
  try {
    const handlers = getHandlers(action);
    console.log('[PlayerActionService] Client-side validation using server handlers:', {
      action,
      handlersFound: handlers.length,
      handlers: handlers.map(h => ({ pluginId: h.pluginId, priority: h.priority }))
    });

    // Run validation through all registered handlers (same as server)
    for (const handler of handlers) {
      if (handler.validate) {
        const request: GameActionRequest = {
          id: 'client-validation-' + Date.now(),
          action,
          parameters,
          playerId,
          sessionId: '',
          timestamp: Date.now()
        };

        const result = handler.validate(request, gameState);
        console.log('[PlayerActionService] Handler validation result:', {
          pluginId: handler.pluginId,
          priority: handler.priority,
          valid: result.valid,
          error: result.error?.message
        });

        if (!result.valid) {
          return result;
        }
      }
    }

    return { valid: true };
  } catch (error) {
    console.warn('[PlayerActionService] Client-side validation error:', error);
    // If client-side validation fails, let server handle it
    return null;
  }
}


/**
 * Main player action service class
 */
export class PlayerActionService {
  private _gameSessionStore?: ReturnType<typeof useGameSessionStore>;
  private _authStore?: ReturnType<typeof useAuthStore>;
  private _socketStore?: ReturnType<typeof useSocketStore>;
  private _gameStateStore?: ReturnType<typeof useGameStateStore>;

  // Lazy getters to avoid Pinia issues during initialization
  private get gameSessionStore() {
    if (!this._gameSessionStore) {
      this._gameSessionStore = useGameSessionStore();
    }
    return this._gameSessionStore;
  }

  private get authStore() {
    if (!this._authStore) {
      this._authStore = useAuthStore();
    }
    return this._authStore;
  }

  private get socketStore() {
    if (!this._socketStore) {
      this._socketStore = useSocketStore();
    }
    return this._socketStore;
  }

  private get gameStateStore() {
    if (!this._gameStateStore) {
      this._gameStateStore = useGameStateStore();
    }
    return this._gameStateStore;
  }

  /**
   * Request an action to be performed
   */
  async requestAction(
    action: GameActionType,
    parameters: Record<string, unknown>,
    options: { 
      description?: string;
    } = {}
  ): Promise<ActionRequestResult> {
    
    if (!this.gameSessionStore.currentSession) {
      throw new Error('No active game session');
    }

    if (!this.authStore.user) {
      throw new Error('User not authenticated');
    }

    // Client-side validation using the same handlers as the server
    // This provides optimization while ensuring consistency with server-side validation
    const clientValidationResult = validateActionClientSide(action, parameters, this.gameStateStore.gameState, this.authStore.user.id);
    
    if (clientValidationResult && !clientValidationResult.valid) {
      console.log('[PlayerActionService] 🚫 Client-side validation failed:', clientValidationResult.error);
      
      return {
        success: false,
        approved: false,
        requestId: '',
        error: clientValidationResult.error?.message || 'Action validation failed'
      };
    }
    
    if (clientValidationResult) {
      console.log('[PlayerActionService] ✅ Client-side validation passed, sending request to server');
    } else {
      console.log('[PlayerActionService] ⏭️ Client-side validation skipped (no handlers), sending request to server');
    }

    const request: GameActionRequest = {
      id: generateRequestId(),
      playerId: this.authStore.user.id,
      sessionId: this.gameSessionStore.currentSession.id,
      timestamp: Date.now(),
      action,
      parameters,
      description: options.description
    };

    console.log('[PlayerActionService] Requesting action:', {
      action,
      description: request.description,
      requestId: request.id,
      parameters
    });

    // Send request via socket to GM client for validation
    return new Promise<ActionRequestResult>((resolve) => {
      console.log('[PlayerActionService] 🚀 SENDING gameAction:request to GM client:', {
        requestId: request.id,
        action: request.action,
        description: request.description
      });
      
      this.socketStore.emit('gameAction:request', request, (response: ActionRequestResponse) => {
        console.log('[PlayerActionService] 📥 RECEIVED GM response:', {
          requestId: response.requestId,
          success: response.success,
          approved: response.approved,
          error: response.error?.message,
          fullResponse: response
        });
        
        resolve({
          success: response.success,
          approved: response.approved || false,
          requestId: response.requestId,
          error: response.error?.message
        });
      });
    });
  }

  // Note: Turn validation is now handled by the same server validation handlers
  // used on client-side for consistency. No need for separate requiresCurrentTurn logic.
  
  private getUserTokens(userId: string) {
    // Get tokens owned by this user (direct ownership via ownerId)
    const tokens = this.gameStateStore.currentEncounter?.tokens || [];
    
    return tokens.filter(token => {
      // Direct ownership check via ownerId field
      if (token.ownerId === userId) {
        return true;
      }
      
      // Fallback to document ownership chain for backwards compatibility
      // This can be removed once all tokens have ownerId set
      if (!token.documentId) return false;
      
      const documents = Object.values(this.gameStateStore.gameState?.documents || {});
      const document = documents.find(doc => doc.id === token.documentId);
      
      // Check if the user owns the document (character/actor) or the document has direct ownerId
      return document?.ownerId === userId || document?.createdBy === userId;
    });
  }
}

// Singleton instance
export const playerActionService = new PlayerActionService();
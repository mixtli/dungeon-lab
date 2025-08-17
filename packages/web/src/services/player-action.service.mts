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

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}


/**
 * Main player action service class
 */
export class PlayerActionService {
  private gameSessionStore = useGameSessionStore();
  private authStore = useAuthStore();
  private socketStore = useSocketStore();
  private gameStateStore = useGameStateStore();

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

    // Check turn-based permissions
    const userId = this.authStore.user.id;
    const userTokens = this.getUserTokens(userId);
    
    // For actions that require it to be your turn
    if (this.requiresCurrentTurn(action)) {
      let hasValidTurn = false;
      
      // For token movement, check the specific token being moved
      if (action === 'move-token') {
        const tokenId = parameters.tokenId as string;
        if (!tokenId) {
          return {
            success: false,
            approved: false,
            requestId: '',
            error: "Invalid token movement request"
          };
        }
        
        // Check if user owns the specific token being moved
        const isUserToken = userTokens.some(token => token.id === tokenId);
        if (!isUserToken) {
          return {
            success: false,
            approved: false,
            requestId: '',
            error: "You don't own this token"
          };
        }
        
        // Check if that specific token can perform the action (is it their turn?)
        hasValidTurn = turnManagerService.canPerformAction(tokenId, action);
      } else {
        // For other actions, check if any user token can perform the action
        hasValidTurn = userTokens.some(token => 
          turnManagerService.canPerformAction(token.id, action)
        );
      }
      
      if (!hasValidTurn) {
        return {
          success: false,
          approved: false,
          requestId: '',
          error: "It's not your turn or you cannot perform this action now"
        };
      }
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
      requestId: request.id
    });

    // Send request via socket to GM client for validation
    return new Promise<ActionRequestResult>((resolve) => {
      console.log('[PlayerActionService] Sending action request via socket:', request.id);
      
      this.socketStore.emit('gameAction:request', request, (response: ActionRequestResponse) => {
        console.log('[PlayerActionService] Received response:', response);
        
        resolve({
          success: response.success,
          approved: response.approved || false,
          requestId: response.requestId,
          error: response.error?.message
        });
      });
    });
  }

  private requiresCurrentTurn(action: GameActionType): boolean {
    return ['move-token', 'attack', 'cast-spell', 'use-ability'].includes(action);
  }
  
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
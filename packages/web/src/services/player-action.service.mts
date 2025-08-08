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




}

// Singleton instance
export const playerActionService = new PlayerActionService();
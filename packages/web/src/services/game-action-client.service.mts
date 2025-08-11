/**
 * Game Action Client Service
 * 
 * Handles sending game action requests from player clients to the GM client
 * via the server routing system. Used when players need to request actions
 * that require GM authority (like ending turns, rolling initiative, etc.)
 */

import { 
  type GameActionRequest, 
  type ActionRequestResponse 
} from '@dungeon-lab/shared/types/index.mjs';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import { useAuthStore } from '../stores/auth.store.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';

export interface EndTurnParameters {
  // No additional parameters needed for end turn
}

export interface RollInitiativeParameters {
  participants?: string[]; // Optional: specific participants to reroll
}

/**
 * Game Action Client Service - sends requests to GM client
 */
export class GameActionClientService {
  // Lazy-loaded stores to avoid initialization order issues
  private get gameSessionStore() {
    return useGameSessionStore();
  }

  private get authStore() {
    return useAuthStore();
  }

  private get socketStore() {
    return useSocketStore();
  }

  /**
   * Send an "end-turn" request to the GM
   */
  async requestEndTurn(): Promise<ActionRequestResponse> {
    const currentSession = this.gameSessionStore.currentSession;
    const currentUser = this.authStore.user;
    
    if (!currentSession || !currentUser) {
      return {
        success: false,
        requestId: '',
        error: {
          code: 'NO_SESSION_OR_USER',
          message: 'No active session or user'
        }
      };
    }

    const request: GameActionRequest = {
      id: this.generateRequestId(),
      action: 'end-turn',
      playerId: currentUser.id,
      sessionId: currentSession.id,
      parameters: {} as EndTurnParameters
    };

    console.log('[GameActionClient] Sending end-turn request:', request.id);

    return this.sendRequest(request);
  }

  /**
   * Send a "roll-initiative" request to the GM
   */
  async requestRollInitiative(participants?: string[]): Promise<ActionRequestResponse> {
    const currentSession = this.gameSessionStore.currentSession;
    const currentUser = this.authStore.user;
    
    if (!currentSession || !currentUser) {
      return {
        success: false,
        requestId: '',
        error: {
          code: 'NO_SESSION_OR_USER',
          message: 'No active session or user'
        }
      };
    }

    const request: GameActionRequest = {
      id: this.generateRequestId(),
      action: 'roll-initiative',
      playerId: currentUser.id,
      sessionId: currentSession.id,
      parameters: { participants } as RollInitiativeParameters
    };

    console.log('[GameActionClient] Sending roll-initiative request:', request.id);

    return this.sendRequest(request);
  }

  /**
   * Send a generic game action request and wait for response
   */
  private sendRequest(request: GameActionRequest): Promise<ActionRequestResponse> {
    return new Promise((resolve) => {
      const timeoutDuration = 30000; // 30 seconds

      const timeout = setTimeout(() => {
        resolve({
          success: false,
          requestId: request.id,
          error: {
            code: 'CLIENT_TIMEOUT',
            message: 'Request timed out waiting for GM response'
          }
        });
      }, timeoutDuration);

      this.socketStore.emit('gameAction:request', request, (response: ActionRequestResponse) => {
        clearTimeout(timeout);
        console.log('[GameActionClient] Received response for request:', request.id, response);
        resolve(response);
      });
    });
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
export const gameActionClientService = new GameActionClientService();
/**
 * Player Actions Composable
 * 
 * Provides easy-to-use methods for common player actions with proper
 * request/approval workflow integration.
 */

import { 
  type MoveTokenParameters,
  type RemoveTokenParameters,
  type ActionRequestResult
} from '@dungeon-lab/shared/types/index.mjs';
import { playerActionService } from '../services/player-action.service.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';


/**
 * Player actions composable
 */
export function usePlayerActions() {
  const gameStateStore = useGameStateStore();

  /**
   * Request token movement
   */
  const requestTokenMove = async (
    tokenId: string, 
    newPosition: { gridX: number; gridY: number; elevation?: number }
  ): Promise<ActionRequestResult> => {
    const token = gameStateStore.currentEncounter?.tokens ? Object.values(gameStateStore.currentEncounter.tokens).find(t => t.id === tokenId) : undefined;
    
    if (!token) {
      throw new Error('Token not found');
    }

    const params: MoveTokenParameters = {
      tokenId,
      newPosition
    };

    return playerActionService.requestAction('move-token', token.documentId, params, tokenId, undefined, {
      description: `Move ${token.name}`
    });
  };


  /**
   * Request token removal
   */
  const requestTokenRemove = async (tokenId: string): Promise<ActionRequestResult> => {
    const token = gameStateStore.currentEncounter?.tokens ? Object.values(gameStateStore.currentEncounter.tokens).find(t => t.id === tokenId) : undefined;
    
    if (!token) {
      throw new Error('Token not found');
    }

    const params: RemoveTokenParameters = {
      tokenId,
      tokenName: token.name
    };

    return playerActionService.requestAction('remove-token', token.documentId, params, tokenId, undefined, {
      description: `Remove token "${token.name}"`
    });
  };

  /**
   * Request generic action
   */
  const requestAction = playerActionService.requestAction.bind(playerActionService);

  return {
    requestTokenMove,
    requestTokenRemove,
    requestAction
  };
}
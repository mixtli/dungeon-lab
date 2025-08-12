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
 * Helper function to calculate distance between positions
 */
function calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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
    newPosition: { x: number; y: number; elevation?: number }
  ): Promise<ActionRequestResult> => {
    const token = gameStateStore.currentEncounter?.tokens?.find(t => t.id === tokenId);
    
    if (!token) {
      throw new Error('Token not found');
    }

    const distance = calculateDistance(token.position, newPosition);
    
    // TODO: Implement proper movement range calculation based on combat state
    const remainingMovement = 30; // Default 30ft movement for now

    const params: MoveTokenParameters = {
      tokenId,
      newPosition,
      distance,
      remainingMovement
    };

    return playerActionService.requestAction('move-token', params, {
      description: `Move ${token.name} ${Math.round(distance)}ft`
    });
  };


  /**
   * Request token removal
   */
  const requestTokenRemove = async (tokenId: string): Promise<ActionRequestResult> => {
    const token = gameStateStore.currentEncounter?.tokens?.find(t => t.id === tokenId);
    
    if (!token) {
      throw new Error('Token not found');
    }

    const params: RemoveTokenParameters = {
      tokenId,
      tokenName: token.name
    };

    return playerActionService.requestAction('remove-token', params, {
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
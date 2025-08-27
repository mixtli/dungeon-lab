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
    const token = gameStateStore.currentEncounter?.tokens ? Object.values(gameStateStore.currentEncounter.tokens).find(t => t.id === tokenId) : undefined;
    
    if (!token) {
      throw new Error('Token not found');
    }

    // Calculate center position from bounds for distance calculation
    // Get the actual grid size from the current map
    const currentMap = gameStateStore.currentEncounter?.currentMap;
    const pixelsPerGrid = currentMap?.uvtt?.resolution?.pixels_per_grid || 50; // fallback to 50
    
    // Calculate center using same corrected formula as PixiMapViewer for consistency
    const currentCenterX = ((token.bounds.topLeft.x + token.bounds.bottomRight.x + 1) / 2) * pixelsPerGrid;
    const currentCenterY = ((token.bounds.topLeft.y + token.bounds.bottomRight.y + 1) / 2) * pixelsPerGrid;
    const currentPosition = { x: currentCenterX, y: currentCenterY, elevation: token.bounds.elevation };
    const distance = calculateDistance(currentPosition, newPosition);

    const params: MoveTokenParameters = {
      tokenId,
      newPosition,
      distance
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
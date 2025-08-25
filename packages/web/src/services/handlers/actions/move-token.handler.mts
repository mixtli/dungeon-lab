/**
 * Move Token Action Handler - Multi-Handler Architecture
 * 
 * Validates and executes token movement using direct draft mutation.
 * Immer automatically generates patches from draft mutations.
 */

import type { GameActionRequest, MoveTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';
import { checkWallCollision } from '../../../utils/collision-detection.mjs';

/**
 * Validate token movement request
 */
const validateMoveToken: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as MoveTokenParameters;
  const gameSessionStore = useGameSessionStore();

  console.log('[MoveTokenHandler] Validating token movement:', {
    tokenId: params.tokenId,
    newPosition: params.newPosition,
    requestId: request.id
  });

  // Validate we have an active encounter
  if (!gameState.currentEncounter) {
    return {
      valid: false,
      error: {
        code: 'NO_ACTIVE_ENCOUNTER',
        message: 'No active encounter for token movement'
      }
    };
  }

  // Find the token
  const token = gameState.currentEncounter.tokens?.[params.tokenId];
  if (!token) {
    return {
      valid: false,
      error: {
        code: 'TOKEN_NOT_FOUND',
        message: 'Token not found in current encounter'
      }
    };
  }

  // Permission check - players can only move player-controlled tokens
  if (!gameSessionStore.isGameMaster && token.isPlayerControlled) {
    // For now, allow all player-controlled token movement
    // TODO: Add proper ownership checking when we have user-character linkage
    console.log('[MoveTokenHandler] Player moving player-controlled token:', {
      playerId: request.playerId,
      tokenId: params.tokenId,
      tokenName: token.name
    });
  }

  // Collision detection using game state map data
  if (!gameState.currentEncounter?.currentMap) {
    console.error('[MoveTokenHandler] CRITICAL: No currentMap in game state! This indicates a serious state management issue.');
    console.log('[MoveTokenHandler] Encounter data:', {
      hasEncounter: !!gameState.currentEncounter,
      encounterId: gameState.currentEncounter?.id,
      mapId: gameState.currentEncounter?.mapId,
      hasCurrentMap: !!gameState.currentEncounter?.currentMap
    });
    // Allow movement to prevent blocking, but this needs to be fixed
  } else {
    // Calculate center position from bounds in grid coordinates
    // Note: bounds are inclusive, so add 1 to bottomRight to get actual boundaries
    const currentGridCenterX = (token.bounds.topLeft.x + token.bounds.bottomRight.x + 1) / 2;
    const currentGridCenterY = (token.bounds.topLeft.y + token.bounds.bottomRight.y + 1) / 2;
    const currentGridPos = { x: currentGridCenterX, y: currentGridCenterY };
    
    // Convert target world position to grid coordinates and get center of target cell
    const mapData = gameState.currentEncounter.currentMap;
    const pixelsPerGrid = mapData.uvtt?.resolution?.pixels_per_grid || 50;
    const targetGridPos = { 
      x: params.newPosition.x / pixelsPerGrid + 0.5, 
      y: params.newPosition.y / pixelsPerGrid + 0.5 
    };
    
    try {
      const collisionDetected = checkWallCollision(currentGridPos, targetGridPos, mapData, false);
      
      if (collisionDetected) {
        console.log('[MoveTokenHandler] ❌ Movement blocked by collision detection');
        return {
          valid: false,
          error: {
            code: 'COLLISION_DETECTED',
            message: 'Movement blocked by wall or obstacle'
          }
        };
      } else {
        console.log('[MoveTokenHandler] ✅ No collision detected, movement allowed');
      }
    } catch (error) {
      console.error('[MoveTokenHandler] Error during collision detection:', error);
      // Allow movement on error to prevent blocking
    }
  }

  return { valid: true };
}

/**
 * Calculate new bounds from center position, preserving token size
 */
function calculateNewBounds(
  params: MoveTokenParameters,
  currentBounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number }; elevation?: number },
  currentMap: { uvtt?: { resolution?: { pixels_per_grid?: number } } } | undefined
) {
  const newCenterX = params.newPosition.x;
  const newCenterY = params.newPosition.y;
  const newElevation = params.newPosition.elevation || currentBounds.elevation || 0;
  
  // Get the actual grid size from current map data
  const pixelsPerGrid = currentMap?.uvtt?.resolution?.pixels_per_grid || 50; // fallback to 50
  
  // Convert center world coordinates to grid coordinates
  const centerGridX = Math.round(newCenterX / pixelsPerGrid);
  const centerGridY = Math.round(newCenterY / pixelsPerGrid);
  
  // Calculate current size
  const width = currentBounds.bottomRight.x - currentBounds.topLeft.x;
  const height = currentBounds.bottomRight.y - currentBounds.topLeft.y;
  
  // Calculate new bounds centered on the new position
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  
  return {
    topLeft: {
      x: centerGridX - halfWidth,
      y: centerGridY - halfHeight
    },
    bottomRight: {
      x: centerGridX + width - halfWidth,
      y: centerGridY + height - halfHeight
    },
    elevation: newElevation
  };
}

/**
 * Execute token movement using direct draft mutation
 * The draft is provided by Immer's produceWithPatches in the GM Action Handler
 */
const executeMoveToken: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as MoveTokenParameters;

  console.log('[MoveTokenHandler] Executing token movement with direct draft mutation:', {
    tokenId: params.tokenId,
    newPosition: params.newPosition,
    requestId: request.id
  });

  // Get the token from the current encounter draft
  // Validation ensures currentEncounter and token exist
  const token = draft.currentEncounter!.tokens![params.tokenId]!;

  // Calculate new bounds using the helper function
  const newBounds = calculateNewBounds(
    params, 
    token.bounds, 
    draft.currentEncounter?.currentMap || undefined
  );

  // Direct draft mutation - Immer will automatically generate patches
  token.bounds = newBounds;

  console.log('[MoveTokenHandler] Token movement executed with direct draft mutation:', {
    tokenId: params.tokenId,
    newBounds,
    requestId: request.id
  });
}

/**
 * Core move-token action handler
 */
export const moveTokenActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  validate: validateMoveToken,
  execute: executeMoveToken,
  approvalMessage: async (request) => {
    const params = request.parameters as MoveTokenParameters;
    return `wants to move token to position (${params.newPosition.x}, ${params.newPosition.y})`;
  }
};
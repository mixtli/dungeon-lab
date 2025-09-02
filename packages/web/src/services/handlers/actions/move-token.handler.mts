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
import { checkWallCollision } from '../../../utils/collision-detection.mjs';

/**
 * Validate token movement request
 */
const validateMoveToken: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as MoveTokenParameters;

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

  // Permission check - ownership validation with GM bypass
  if (token.documentId) {
    const character = gameState.documents[token.documentId];
    if (character) {
      const isOwner = character.ownerId === request.playerId;
      const isGM = request.playerId === gameState.campaign?.gameMasterId;
      
      if (!isOwner && !isGM) {
        return {
          valid: false,
          error: {
            code: 'NOT_OWNER',
            message: `You don't own ${character.name}`
          }
        };
      }
      
      console.log('[MoveTokenHandler] Ownership validation passed:', {
        playerId: request.playerId,
        tokenId: params.tokenId,
        tokenName: token.name,
        characterName: character.name,
        isOwner,
        isGM
      });
    }
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
    
    // Target position is already in grid coordinates (top-left corner)
    // Calculate center of target position for collision detection
    const tokenWidth = token.bounds.bottomRight.x - token.bounds.topLeft.x + 1;
    const tokenHeight = token.bounds.bottomRight.y - token.bounds.topLeft.y + 1;
    const targetGridCenterX = params.newPosition.gridX + tokenWidth / 2;
    const targetGridCenterY = params.newPosition.gridY + tokenHeight / 2;
    const targetGridPos = { x: targetGridCenterX, y: targetGridCenterY };
    
    // Debug backend position calculations
    console.log('[MoveTokenHandler] Backend position calculation debug:', {
      tokenId: params.tokenId,
      tokenBounds: token.bounds,
      tokenSize: { width: tokenWidth, height: tokenHeight },
      currentGridCenter: { x: currentGridCenterX, y: currentGridCenterY },
      receivedTargetGrid: params.newPosition,
      targetGridCenter: { x: targetGridCenterX, y: targetGridCenterY }
    });
    
    try {
      const mapData = gameState.currentEncounter.currentMap;
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
 * Calculate new bounds from top-left grid position, preserving token size
 */
function calculateNewBounds(
  params: MoveTokenParameters,
  currentBounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number }; elevation?: number }
) {
  const newTopLeftX = params.newPosition.gridX;
  const newTopLeftY = params.newPosition.gridY;
  const newElevation = params.newPosition.elevation || currentBounds.elevation || 0;
  
  // Calculate current size
  const width = currentBounds.bottomRight.x - currentBounds.topLeft.x;
  const height = currentBounds.bottomRight.y - currentBounds.topLeft.y;
  
  // Calculate new bounds using the grid top-left position
  return {
    topLeft: {
      x: newTopLeftX,
      y: newTopLeftY
    },
    bottomRight: {
      x: newTopLeftX + width,
      y: newTopLeftY + height
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
  const newBounds = calculateNewBounds(params, token.bounds);

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
    return `wants to move token to grid position (${params.newPosition.gridX}, ${params.newPosition.gridY})`;
  }
};
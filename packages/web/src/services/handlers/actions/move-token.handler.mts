/**
 * Move Token Action Handler
 * 
 * Pure business logic for token movement operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, MoveTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';
import { checkWallCollision } from '../../../utils/collision-detection.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute token movement operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function moveTokenHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as MoveTokenParameters;
  const gameStateStore = useGameStateStore();
  const gameSessionStore = useGameSessionStore();
  
  console.log('[MoveTokenHandler] Processing token movement:', {
    tokenId: params.tokenId,
    newPosition: params.newPosition,
    requestId: request.id
  });

  try {
    // Validate we have an active encounter
    if (!gameStateStore.currentEncounter) {
      return {
        success: false,
        error: {
          code: 'NO_ACTIVE_ENCOUNTER',
          message: 'No active encounter for token movement'
        }
      };
    }

    // Find the token
    const token = gameStateStore.currentEncounter.tokens?.find(t => t.id === params.tokenId);
    if (!token) {
      return {
        success: false,
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
  if (!gameStateStore.currentEncounter?.currentMap) {
    console.error('[MoveTokenHandler] CRITICAL: No currentMap in game state! This indicates a serious state management issue.');
    console.log('[MoveTokenHandler] Encounter data:', {
      hasEncounter: !!gameStateStore.currentEncounter,
      encounterId: gameStateStore.currentEncounter?.id,
      mapId: gameStateStore.currentEncounter?.mapId,
      hasCurrentMap: !!gameStateStore.currentEncounter?.currentMap
    });
    // Allow movement to prevent blocking, but this needs to be fixed
  } else {
    // Calculate center position from bounds in grid coordinates
    // Note: bounds are inclusive, so add 1 to bottomRight to get actual boundaries
    const currentGridCenterX = (token.bounds.topLeft.x + token.bounds.bottomRight.x + 1) / 2;
    const currentGridCenterY = (token.bounds.topLeft.y + token.bounds.bottomRight.y + 1) / 2;
    const currentGridPos = { x: currentGridCenterX, y: currentGridCenterY };
    
    // Convert target world position to grid coordinates and get center of target cell
    const mapData = gameStateStore.currentEncounter.currentMap;
    const pixelsPerGrid = mapData.uvtt?.resolution?.pixels_per_grid || 50;
    const targetGridPos = { 
      x: params.newPosition.x / pixelsPerGrid + 0.5, 
      y: params.newPosition.y / pixelsPerGrid + 0.5 
    };
    
    // console.log('[MoveTokenHandler] 🔍 COLLISION DETECTION DEBUG:', {
    //   tokenId: params.tokenId,
    //   tokenName: token.name,
    //   tokenBounds: {
    //     topLeft: token.bounds.topLeft,
    //     bottomRight: token.bounds.bottomRight
    //   },
    //   rawCurrentCenter: {
    //     x: (token.bounds.topLeft.x + token.bounds.bottomRight.x) / 2,
    //     y: (token.bounds.topLeft.y + token.bounds.bottomRight.y) / 2
    //   },
    //   correctedCurrentCenter: currentGridPos,
    //   targetWorldPos: params.newPosition,
    //   targetGridPos: targetGridPos,
    //   pixelsPerGrid: pixelsPerGrid,
    //   movementVector: {
    //     x: targetGridPos.x - currentGridPos.x,
    //     y: targetGridPos.y - currentGridPos.y
    //   },
    //   wallDataAvailable: {
    //     hasUvtt: !!mapData.uvtt,
    //     hasLineOfSight: !!mapData.uvtt?.line_of_sight,
    //     hasObjectsLineOfSight: !!mapData.uvtt?.objects_line_of_sight,
    //     lineOfSightCount: mapData.uvtt?.line_of_sight?.length || 0,
    //     objectsLineOfSightCount: mapData.uvtt?.objects_line_of_sight?.length || 0
    //   }
    // });
    
    try {
      const collisionDetected = checkWallCollision(currentGridPos, targetGridPos, mapData, false);
      
      // console.log('[MoveTokenHandler] 🎯 COLLISION RESULT:', {
      //   collisionDetected,
      //   movementLine: `from (${currentGridPos.x}, ${currentGridPos.y}) to (${targetGridPos.x}, ${targetGridPos.y})`,
      //   blocked: collisionDetected ? 'YES - MOVEMENT BLOCKED' : 'NO - MOVEMENT ALLOWED'
      // });
      
      if (collisionDetected) {
        console.log('[MoveTokenHandler] ❌ Movement blocked by collision detection');
        return {
          success: false,
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

    // Movement is valid - execute via game state update
    const tokenIndex = gameStateStore.currentEncounter.tokens?.findIndex(t => t.id === params.tokenId);
    if (tokenIndex === undefined || tokenIndex === -1) {
      return {
        success: false,
        error: {
          code: 'TOKEN_INDEX_ERROR',
          message: 'Could not locate token for update'
        }
      };
    }

  // Calculate new bounds from center position, preserving token size
  const currentBounds = token.bounds;
  const newCenterX = params.newPosition.x;
  const newCenterY = params.newPosition.y;
  const newElevation = params.newPosition.elevation || currentBounds.elevation || 0;
  
  // Get the actual grid size from current map data
  const currentMap = gameStateStore.currentEncounter?.currentMap;
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
  
  const newBounds = {
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

  const operations = [
    {
      op: 'replace' as const,
      path: `/currentEncounter/tokens/${tokenIndex}/bounds`,
      value: newBounds
    }
  ];

    console.log('[MoveTokenHandler] Token movement validation successful, returning operations:', {
      tokenId: params.tokenId,
      newPosition: params.newPosition,
      requestId: request.id,
      operationsCount: operations.length
    });

    return { 
      success: true,
      stateOperations: operations
    };

  } catch (error) {
    console.error('[MoveTokenHandler] Error executing token movement:', error);
    return {
      success: false,
      error: {
        code: 'MOVEMENT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process token movement'
      }
    };
  }
}
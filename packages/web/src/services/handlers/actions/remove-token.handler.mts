/**
 * Remove Token Action Handler
 * 
 * Pure business logic for token removal operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, RemoveTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute token removal operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function removeTokenHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as RemoveTokenParameters;
  const gameStateStore = useGameStateStore();
  const gameSessionStore = useGameSessionStore();
  
  console.log('[RemoveTokenHandler] Processing token removal:', {
    tokenId: params.tokenId,
    tokenName: params.tokenName,
    requestId: request.id
  });

  try {
    // Validate we have an active encounter
    if (!gameStateStore.currentEncounter) {
      return {
        success: false,
        error: {
          code: 'NO_ACTIVE_ENCOUNTER',
          message: 'No active encounter for token removal'
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

    // Permission check - GM can always remove tokens
    const isGM = request.playerId === gameSessionStore.currentSession?.gameMasterId;
    
    if (!isGM) {
      // Players can only request removal of their own tokens
      // For now, deny all non-GM requests to maintain GM authority
      console.log('[RemoveTokenHandler] Non-GM attempted token removal, denying request:', {
        playerId: request.playerId,
        tokenId: params.tokenId
      });
      
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Only the Game Master can remove tokens'
        }
      };
    }

    // Token removal is valid - execute via game state update
    // Find the token index for JSON Patch remove operation
    const tokenIndex = gameStateStore.currentEncounter.tokens?.findIndex(t => t.id === params.tokenId);
    if (tokenIndex === undefined || tokenIndex === -1) {
      return {
        success: false,
        error: {
          code: 'TOKEN_INDEX_NOT_FOUND',
          message: 'Token not found for removal'
        }
      };
    }

    const operations = [{
      op: 'remove' as const,
      path: `/currentEncounter/tokens/${tokenIndex}`
    }];
    
    // Also remove from turn order if it exists
    if (gameStateStore.gameState?.turnManager?.participants) {
      // Find the participant that has this tokenId
      const participantToRemove = gameStateStore.gameState.turnManager.participants.find(
        participant => participant.tokenId === params.tokenId
      );
      
      if (participantToRemove) {
        // Find the participant index for JSON Patch remove operation
        const participantIndex = gameStateStore.gameState.turnManager.participants.findIndex(
          participant => participant.tokenId === params.tokenId
        );
        
        if (participantIndex !== -1) {
          console.log('[RemoveTokenHandler] Removing token from turn order:', {
            tokenId: params.tokenId,
            participantId: participantToRemove.id,
            participantIndex: participantIndex,
            participantCount: gameStateStore.gameState.turnManager.participants.length
          });
          
          operations.push({
            op: 'remove' as const,
            path: `/turnManager/participants/${participantIndex}`
          });
        }
      }
    }

    // Execute the game state update
    const updateResult = await gameStateStore.updateGameState(operations);
    
    if (!updateResult.success) {
      return {
        success: false,
        error: {
          code: 'STATE_UPDATE_FAILED',
          message: updateResult.error?.message || 'Failed to update game state'
        }
      };
    }

    console.log('[RemoveTokenHandler] Token removal executed successfully:', {
      tokenId: params.tokenId,
      tokenName: params.tokenName,
      removedFromTurnOrder: !!gameStateStore.gameState?.turnManager?.participants,
      requestId: request.id
    });

    return { success: true };

  } catch (error) {
    console.error('[RemoveTokenHandler] Error executing token removal:', error);
    return {
      success: false,
      error: {
        code: 'TOKEN_REMOVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to remove token'
      }
    };
  }
}
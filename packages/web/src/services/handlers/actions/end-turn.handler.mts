/**
 * End Turn Action Handler
 * 
 * Pure business logic for ending turn operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';
import { turnManagerService } from '../../turn-manager.service.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute end turn operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function endTurnHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const gameStateStore = useGameStateStore();
  const gameSessionStore = useGameSessionStore();
  
  console.log('[EndTurnHandler] Processing end turn request from:', request.playerId);

  try {
    // Check if we have active turn order
    if (!gameStateStore.gameState?.turnManager?.isActive) {
      return {
        success: false,
        error: {
          code: 'NO_ACTIVE_TURN_ORDER',
          message: 'No active turn order'
        }
      };
    }

    const turnManager = gameStateStore.gameState.turnManager;
    const currentParticipant = turnManager.participants[turnManager.currentTurn];

    console.log('[EndTurnHandler] Current turn state:', {
      currentParticipant: currentParticipant ? {
        tokenId: currentParticipant.tokenId,
        actorId: currentParticipant.actorId,
        hasActed: currentParticipant.hasActed
      } : null,
      currentTurn: turnManager.currentTurn,
      round: turnManager.round
    });

    // Permission check: GM can always end turns, current player can end their own turn
    const isGM = request.playerId === gameSessionStore.currentSession?.gameMasterId;
    
    if (!isGM) {
      // For non-GM players, verify they own the current turn
      // This would need proper ownership checking implementation
      console.log('[EndTurnHandler] Player requesting to end turn - permission validation needed');
    }

    // Use turn manager service to advance turn
    console.log('[EndTurnHandler] Advancing turn via turnManagerService');
    await turnManagerService.nextTurn();

    console.log('[EndTurnHandler] Turn ended successfully:', {
      requestId: request.id,
      playerId: request.playerId
    });

    return { success: true };

  } catch (error) {
    console.error('[EndTurnHandler] Error executing turn end:', error);
    return {
      success: false,
      error: {
        code: 'TURN_END_FAILED',
        message: error instanceof Error ? error.message : 'Failed to end turn'
      }
    };
  }
}
/**
 * End Turn Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes turn ending using Immer for direct state mutations.
 */

import type { GameActionRequest } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';

/**
 * Validate end turn request
 */
function validateEndTurn(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ValidationResult {
  const gameSessionStore = useGameSessionStore();

  console.log('[EndTurnHandler] Validating end turn request from:', request.playerId);

  // Check if we have active turn order
  if (!gameState.turnManager?.isActive) {
    return {
      valid: false,
      error: {
        code: 'NO_ACTIVE_TURN_ORDER',
        message: 'No active turn order'
      }
    };
  }

  const turnManager = gameState.turnManager;
  if (!turnManager.participants || turnManager.participants.length === 0) {
    return {
      valid: false,
      error: {
        code: 'NO_PARTICIPANTS',
        message: 'No participants in turn order'
      }
    };
  }

  const currentParticipant = turnManager.participants[turnManager.currentTurn];
  if (!currentParticipant) {
    return {
      valid: false,
      error: {
        code: 'INVALID_CURRENT_TURN',
        message: 'Current turn index is invalid'
      }
    };
  }

  console.log('[EndTurnHandler] Current turn state:', {
    currentParticipant: {
      tokenId: currentParticipant.tokenId,
      actorId: currentParticipant.actorId,
      hasActed: currentParticipant.hasActed
    },
    currentTurn: turnManager.currentTurn,
    round: turnManager.round
  });

  // Permission check: GM can always end turns, current player can end their own turn
  const isGM = request.playerId === gameSessionStore.currentSession?.gameMasterId;
  
  if (!isGM) {
    // For non-GM players, verify they own the current turn
    // This would need proper ownership checking implementation
    console.log('[EndTurnHandler] Player requesting to end turn - permission validation needed');
    // For now, allow all players to end turns (GM authority will be maintained through approval)
  }

  return { valid: true };
}

/**
 * Execute turn ending using direct state mutation
 */
function executeEndTurn(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[EndTurnHandler] Executing turn end:', {
    requestId: request.id,
    playerId: request.playerId
  });

  const turnManager = draft.turnManager;
  if (!turnManager || !turnManager.participants) {
    throw new Error('Invalid turn manager state');
  }

  // Mark current participant as having acted
  const currentParticipant = turnManager.participants[turnManager.currentTurn];
  if (currentParticipant) {
    currentParticipant.hasActed = true;
  }

  // Advance to next turn
  let nextTurn = turnManager.currentTurn + 1;
  
  // Check if we need to start a new round
  if (nextTurn >= turnManager.participants.length) {
    nextTurn = 0;
    turnManager.round += 1;
    
    // Reset hasActed for all participants for the new round
    for (const participant of turnManager.participants) {
      participant.hasActed = false;
    }
    
    console.log('[EndTurnHandler] Starting new round:', turnManager.round);
  }

  // Update current turn
  turnManager.currentTurn = nextTurn;

  console.log('[EndTurnHandler] Turn ended successfully:', {
    newCurrentTurn: nextTurn,
    round: turnManager.round,
    nextParticipant: turnManager.participants[nextTurn] ? {
      tokenId: turnManager.participants[nextTurn].tokenId,
      actorId: turnManager.participants[nextTurn].actorId
    } : null,
    requestId: request.id
  });
}

/**
 * Core end-turn action handler
 */
export const endTurnActionHandler: ActionHandler = {
  priority: 0, // Core handler runs first
  validate: validateEndTurn,
  execute: executeEndTurn,
  approvalMessage: () => "wants to end their turn"
};
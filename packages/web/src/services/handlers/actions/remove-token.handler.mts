/**
 * Remove Token Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes token removal using Immer for direct state mutations.
 */

import type { GameActionRequest, RemoveTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';

/**
 * Validate token removal request
 */
async function validateRemoveToken(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ValidationResult> {
  const params = request.parameters as RemoveTokenParameters;
  const gameSessionStore = useGameSessionStore();

  console.log('[RemoveTokenHandler] Validating token removal:', {
    tokenId: params.tokenId,
    tokenName: params.tokenName,
    requestId: request.id
  });

  // Validate we have an active encounter
  if (!gameState.currentEncounter) {
    return {
      valid: false,
      error: {
        code: 'NO_ACTIVE_ENCOUNTER',
        message: 'No active encounter for token removal'
      }
    };
  }

  // Find the token
  const token = gameState.currentEncounter.tokens?.find(t => t.id === params.tokenId);
  if (!token) {
    return {
      valid: false,
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
      valid: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Only the Game Master can remove tokens'
      }
    };
  }

  return { valid: true };
}

/**
 * Execute token removal using direct state mutation
 */
async function executeRemoveToken(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): Promise<void> {
  const params = request.parameters as RemoveTokenParameters;

  console.log('[RemoveTokenHandler] Executing token removal:', {
    tokenId: params.tokenId,
    tokenName: params.tokenName,
    requestId: request.id
  });

  // Find the token index for removal
  const tokenIndex = draft.currentEncounter?.tokens?.findIndex(t => t.id === params.tokenId);
  if (tokenIndex === undefined || tokenIndex === -1 || !draft.currentEncounter?.tokens) {
    throw new Error('Token not found for removal');
  }

  // Direct mutation - remove token from array
  draft.currentEncounter.tokens.splice(tokenIndex, 1);

  // Also remove from turn order if it exists
  if (draft.turnManager?.participants) {
    // Find the participant that has this tokenId
    const participantIndex = draft.turnManager.participants.findIndex(
      participant => participant.tokenId === params.tokenId
    );
    
    if (participantIndex !== -1) {
      console.log('[RemoveTokenHandler] Removing token from turn order:', {
        tokenId: params.tokenId,
        participantIndex: participantIndex,
        participantCount: draft.turnManager.participants.length
      });
      
      // Direct mutation - remove participant from array
      draft.turnManager.participants.splice(participantIndex, 1);
    }
  }

  console.log('[RemoveTokenHandler] Token removal executed successfully:', {
    tokenId: params.tokenId,
    tokenName: params.tokenName,
    requestId: request.id
  });
}

/**
 * Core remove-token action handler
 */
export const removeTokenActionHandler: ActionHandler = {
  priority: 0, // Core handler runs first
  gmOnly: true, // Only GMs can remove tokens
  validate: validateRemoveToken,
  execute: executeRemoveToken,
  approvalMessage: async (request) => {
    const params = request.parameters as RemoveTokenParameters;
    return `wants to remove token "${params.tokenName || params.tokenId}"`;
  }
};
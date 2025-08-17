/**
 * Remove Token Action Handler
 * 
 * Pure business logic for token removal operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, RemoveTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mjs';

/**
 * Execute token removal operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function removeTokenHandler(request: GameActionRequest): Promise<void> {
  const params = request.parameters as RemoveTokenParameters;
  const gameStateStore = useGameStateStore();
  const gameSessionStore = useGameSessionStore();
  
  console.log('[RemoveTokenHandler] Processing token removal:', {
    tokenId: params.tokenId,
    tokenName: params.tokenName,
    requestId: request.id
  });

  // Validate we have an active encounter
  if (!gameStateStore.currentEncounter) {
    throw new Error('No active encounter for token removal');
  }

  // Find the token
  const token = gameStateStore.currentEncounter.tokens?.find(t => t.id === params.tokenId);
  if (!token) {
    throw new Error('Token not found in current encounter');
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
    
    throw new Error('Only the Game Master can remove tokens');
  }

  // Token removal is valid - execute via game state update
  const operations = [{
    path: 'currentEncounter.tokens',
    operation: 'pull' as const,
    value: { id: params.tokenId } // MongoDB pull syntax to remove by ID
  }];
  
  // Also remove from turn order if it exists
  if (gameStateStore.gameState?.turnManager?.participants) {
    // Find the participant that has this tokenId
    const participantToRemove = gameStateStore.gameState.turnManager.participants.find(
      participant => participant.tokenId === params.tokenId
    );
    
    if (participantToRemove) {
      console.log('[RemoveTokenHandler] Removing token from turn order:', {
        tokenId: params.tokenId,
        participantId: participantToRemove.id,
        participantCount: gameStateStore.gameState.turnManager.participants.length
      });
      
      operations.push({
        path: 'turnManager.participants',
        operation: 'pull' as const,
        value: { id: participantToRemove.id } // Remove participant by ID
      });
    }
  }

  // Execute the game state update
  const updateResult = await gameStateStore.updateGameState(operations);
  
  if (!updateResult.success) {
    throw new Error(updateResult.error?.message || 'Failed to update game state');
  }

  console.log('[RemoveTokenHandler] Token removal executed successfully:', {
    tokenId: params.tokenId,
    tokenName: params.tokenName,
    removedFromTurnOrder: !!gameStateStore.gameState?.turnManager?.participants,
    requestId: request.id
  });
}
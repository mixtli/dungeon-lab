/**
 * Roll Initiative Action Handler
 * 
 * Pure business logic for initiative rolling operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, RollInitiativeParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { turnManagerService } from '../../turn-manager.service.mjs';

/**
 * Execute initiative rolling operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function rollInitiativeHandler(request: GameActionRequest): Promise<void> {
  const params = request.parameters as RollInitiativeParameters;
  const gameStateStore = useGameStateStore();
  
  console.log('[RollInitiativeHandler] Processing initiative roll:', {
    participants: params.participants,
    requestId: request.id
  });

  // Check if we have an active encounter
  if (!gameStateStore.currentEncounter) {
    throw new Error('No active encounter for initiative roll');
  }

  // Use turn manager service to roll initiative
  console.log('[RollInitiativeHandler] Rolling initiative via turnManagerService');
  
  if (params.participants && params.participants.length > 0) {
    // Roll for specific participants
    await turnManagerService.rollInitiativeForParticipants(params.participants);
  } else {
    // Roll for all participants
    await turnManagerService.rollInitiative();
  }

  console.log('[RollInitiativeHandler] Initiative rolled successfully:', {
    requestId: request.id,
    participantCount: params.participants?.length || 'all'
  });
}
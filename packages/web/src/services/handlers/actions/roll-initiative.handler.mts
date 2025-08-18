/**
 * Roll Initiative Action Handler
 * 
 * Pure business logic for initiative rolling operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, RollInitiativeParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { turnManagerService } from '../../turn-manager.service.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute initiative rolling operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function rollInitiativeHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as RollInitiativeParameters;
  const gameStateStore = useGameStateStore();
  
  console.log('[RollInitiativeHandler] Processing initiative roll:', {
    participants: params.participants,
    requestId: request.id
  });

  try {
    // Check if we have an active encounter
    if (!gameStateStore.currentEncounter) {
      return {
        success: false,
        error: {
          code: 'NO_ACTIVE_ENCOUNTER',
          message: 'No active encounter for initiative roll'
        }
      };
    }

    // Use turn manager service to recalculate initiative
    console.log('[RollInitiativeHandler] Recalculating initiative via turnManagerService');
    
    // The TurnManagerService only has recalculateInitiative() method
    // TODO: In the future, we may want to add support for rolling initiative for specific participants
    await turnManagerService.recalculateInitiative();

    console.log('[RollInitiativeHandler] Initiative recalculated successfully:', {
      requestId: request.id,
      participantCount: params.participants?.length || 'all'
    });

    return { success: true };

  } catch (error) {
    console.error('[RollInitiativeHandler] Error executing initiative roll:', error);
    return {
      success: false,
      error: {
        code: 'INITIATIVE_ROLL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to roll initiative'
      }
    };
  }
}
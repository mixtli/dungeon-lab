/**
 * Stop Encounter Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes encounter stopping using Immer for direct state mutations.
 */

import type { GameActionRequest, StopEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';

/**
 * Validate stop encounter request
 */
function validateStopEncounter(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ValidationResult {
  const params = request.parameters as StopEncounterParameters;

  console.log('[StopEncounterHandler] Validating encounter stop:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // Validate parameters
  if (!params.encounterId) {
    return {
      valid: false,
      error: {
        code: 'MISSING_ENCOUNTER_ID',
        message: 'Missing encounter ID for encounter stop'
      }
    };
  }

  // Check if there's an active encounter to stop
  if (!gameState.currentEncounter) {
    return {
      valid: false,
      error: {
        code: 'NO_ACTIVE_ENCOUNTER',
        message: 'No active encounter to stop'
      }
    };
  }

  // Check if the encounter ID matches
  if (gameState.currentEncounter.id !== params.encounterId) {
    return {
      valid: false,
      error: {
        code: 'ENCOUNTER_MISMATCH',
        message: 'Encounter ID does not match the current active encounter'
      }
    };
  }

  // Check if encounter is already stopped
  if (gameState.currentEncounter.status === 'stopped') {
    return {
      valid: false,
      error: {
        code: 'ENCOUNTER_ALREADY_STOPPED',
        message: 'Encounter is already stopped'
      }
    };
  }

  return { valid: true };
}

/**
 * Execute encounter stop using direct state mutation
 */
function executeStopEncounter(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): void {
  const params = request.parameters as StopEncounterParameters;

  console.log('[StopEncounterHandler] Executing encounter stop:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // Stop the current encounter
  if (draft.currentEncounter) {
    draft.currentEncounter.status = 'stopped';
  }

  // Deactivate turn manager
  if (draft.turnManager) {
    draft.turnManager.isActive = false;
    // Optionally reset turn manager completely
    draft.turnManager.currentTurn = 0;
    draft.turnManager.round = 1;
    
    // Mark all participants as not having acted
    for (const participant of draft.turnManager.participants) {
      participant.hasActed = false;
    }
  }

  console.log('[StopEncounterHandler] Encounter stopped successfully:', {
    encounterId: params.encounterId,
    encounterStatus: draft.currentEncounter?.status,
    turnManagerActive: draft.turnManager?.isActive,
    requestId: request.id
  });
}

/**
 * Core stop-encounter action handler
 */
export const stopEncounterActionHandler: ActionHandler = {
  priority: 0, // Core handler runs first
  gmOnly: true, // Only GMs can stop encounters
  validate: validateStopEncounter,
  execute: executeStopEncounter,
  approvalMessage: (request) => {
    const params = request.parameters as StopEncounterParameters;
    return `wants to stop encounter ${params.encounterId}`;
  }
};
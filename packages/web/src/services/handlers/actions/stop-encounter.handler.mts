/**
 * Stop Encounter Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes encounter stopping using Immer for direct state mutations.
 */

import type { GameActionRequest, StopEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';
import { generateLifecycleResetPatches } from '@dungeon-lab/shared/utils/document-state-lifecycle.mjs';

/**
 * Validate stop encounter request
 */
async function validateStopEncounter(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ValidationResult> {
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
async function executeStopEncounter(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): Promise<void> {
  const params = request.parameters as StopEncounterParameters;

  console.log('[StopEncounterHandler] Executing encounter stop:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // Collect document IDs for all participants to reset their encounter state
  const participantDocumentIds: string[] = [];
  if (draft.turnManager?.participants) {
    for (const participant of draft.turnManager.participants) {
      if (participant.actorId) {
        participantDocumentIds.push(participant.actorId);
      }
    }
  }

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

  // Apply document state lifecycle resets for encounter end
  // This resets encounter-scoped state for all participants
  try {
    const lifecyclePatches = generateLifecycleResetPatches(participantDocumentIds, 'encounter');
    
    if (lifecyclePatches.length > 0) {
      console.log(`[StopEncounterHandler] Applying ${lifecyclePatches.length} encounter lifecycle reset patches`);
      
      // Apply lifecycle patches directly to the draft state
      // Each patch resets specific state sections on documents
      for (const patch of lifecyclePatches) {
        if (patch.op === 'replace' && patch.path.startsWith('/documents/')) {
          const pathParts = patch.path.split('/');
          const documentId = pathParts[2];
          const stateSection = pathParts[4]; // e.g., 'encounterState'
          
          if (draft.documents[documentId]) {
            (draft.documents[documentId].state as Record<string, unknown>)[stateSection] = patch.value;
            console.log(`[StopEncounterHandler] Reset ${stateSection} for document ${documentId}`);
          }
        }
      }
      
      console.log('[StopEncounterHandler] Encounter lifecycle resets applied successfully');
    } else {
      console.log('[StopEncounterHandler] No encounter lifecycle resets registered');
    }
  } catch (error) {
    console.error('[StopEncounterHandler] Failed to apply encounter lifecycle resets:', error);
    // Don't throw - encounter stop should still succeed even if lifecycle resets fail
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
  approvalMessage: async (request) => {
    const params = request.parameters as StopEncounterParameters;
    return `wants to stop encounter ${params.encounterId}`;
  }
};
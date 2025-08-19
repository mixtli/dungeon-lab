/**
 * Start Encounter Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes encounter starting using Immer for direct state mutations.
 */

import type { GameActionRequest, StartEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';

/**
 * Validate start encounter request
 */
function validateStartEncounter(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ValidationResult {
  const params = request.parameters as StartEncounterParameters;

  console.log('[StartEncounterHandler] Validating encounter start:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // Validate parameters
  if (!params.encounterId) {
    return {
      valid: false,
      error: {
        code: 'MISSING_ENCOUNTER_ID',
        message: 'Missing encounter ID for encounter start'
      }
    };
  }

  // Check if encounter is already active
  if (gameState.currentEncounter && gameState.currentEncounter.status === 'in_progress') {
    return {
      valid: false,
      error: {
        code: 'ENCOUNTER_ALREADY_ACTIVE',
        message: 'An encounter is already in progress'
      }
    };
  }

  // In the new architecture, we'll set the encounter as the current one
  // The actual encounter data would come from the database/API in a real implementation
  // For now, we assume the encounter ID is valid

  return { valid: true };
}

/**
 * Execute encounter start using direct state mutation
 */
function executeStartEncounter(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): void {
  const params = request.parameters as StartEncounterParameters;

  console.log('[StartEncounterHandler] Executing encounter start:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // In a real implementation, we would load encounter data from the database
  // For now, we'll create a basic encounter structure
  // This would normally be handled by a service that loads encounter data
  
  if (!draft.currentEncounter) {
    // Create a basic encounter structure
    // In reality, this data would come from loading the encounter by ID
    draft.currentEncounter = {
      id: params.encounterId,
      name: `Encounter ${params.encounterId}`,
      status: 'in_progress',
      campaignId: draft.campaign?.id || '',
      mapId: '', // Would be loaded from encounter data
      participants: [],
      tokens: [],
      settings: {
        showHiddenTokensToPlayers: false,
        gridSize: 5,
        gridType: 'square',
        enableFogOfWar: false,
        enableDynamicLighting: false
      }
    };
  } else {
    // Update existing encounter to in_progress
    draft.currentEncounter.status = 'in_progress';
    draft.currentEncounter.id = params.encounterId;
  }

  // Reset turn manager for the new encounter
  draft.turnManager = {
    participants: [],
    isActive: false,
    currentTurn: 0,
    round: 1
  };

  console.log('[StartEncounterHandler] Encounter started successfully:', {
    encounterId: params.encounterId,
    encounterStatus: draft.currentEncounter.status,
    requestId: request.id
  });
}

/**
 * Core start-encounter action handler
 */
export const startEncounterActionHandler: ActionHandler = {
  priority: 0, // Core handler runs first
  gmOnly: true, // Only GMs can start encounters
  validate: validateStartEncounter,
  execute: executeStartEncounter,
  approvalMessage: (request) => {
    const params = request.parameters as StartEncounterParameters;
    return `wants to start encounter ${params.encounterId}`;
  }
};
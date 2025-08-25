/**
 * Start Encounter Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes encounter starting using Immer for direct state mutations.
 */

import type { GameActionRequest, StartEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import { EncountersClient } from '@dungeon-lab/client/encounters.client.mjs';

/**
 * Validate start encounter request
 */
const validateStartEncounter: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
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
const executeStartEncounter: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as StartEncounterParameters;

  console.log('[StartEncounterHandler] Executing encounter start:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  try {
    // Fetch the actual encounter data from the database via API
    const encountersClient = new EncountersClient();
    const encounterData = await encountersClient.getEncounter(params.encounterId);
    
    console.log('[StartEncounterHandler] Fetched encounter data from API:', {
      encounterId: encounterData.id,
      name: encounterData.name,
      mapId: encounterData.mapId,
      hasCurrentMap: !!encounterData.currentMap,
      participantCount: encounterData.participants?.length || 0,
      tokenCount: encounterData.tokens?.length || 0,
      requestId: request.id
    });

    // Set the complete encounter data in the game state
    draft.currentEncounter = {
      id: encounterData.id,
      name: encounterData.name,
      status: 'in_progress', // Override status to in_progress
      campaignId: encounterData.campaignId,
      mapId: encounterData.mapId,
      currentMap: encounterData.currentMap, // Include the populated map data
      participants: encounterData.participants || [],
      tokens: encounterData.tokens || [],
      settings: encounterData.settings || {
        showHiddenTokensToPlayers: false,
        gridSize: 5,
        gridType: 'square',
        enableFogOfWar: false,
        enableDynamicLighting: false
      }
    };

    // Reset turn manager for the new encounter
    draft.turnManager = {
      participants: [],
      isActive: false,
      currentTurn: 0,
      round: 1
    };

    console.log('[StartEncounterHandler] Encounter started successfully with complete data:', {
      encounterId: params.encounterId,
      encounterName: draft.currentEncounter.name,
      mapId: draft.currentEncounter.mapId,
      hasCurrentMap: !!draft.currentEncounter.currentMap,
      encounterStatus: draft.currentEncounter.status,
      requestId: request.id
    });
    
  } catch (error) {
    console.error('[StartEncounterHandler] Failed to fetch encounter data:', {
      encounterId: params.encounterId,
      error: error instanceof Error ? error.message : String(error),
      requestId: request.id
    });
    
    // Re-throw the error to be handled by the action handler system
    throw new Error(`Failed to load encounter ${params.encounterId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Core start-encounter action handler
 */
export const startEncounterActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  gmOnly: true, // Only GMs can start encounters
  validate: validateStartEncounter,
  execute: executeStartEncounter,
  approvalMessage: async (request) => {
    const params = request.parameters as StartEncounterParameters;
    return `wants to start encounter ${params.encounterId}`;
  }
};
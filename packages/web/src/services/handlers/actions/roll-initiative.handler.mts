/**
 * Roll Initiative Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes initiative rolling using Immer for direct state mutations.
 */

import type { GameActionRequest, RollInitiativeParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import { pluginRegistry } from '../../plugin-registry.mjs';

/**
 * Validate roll initiative request
 */
const validateRollInitiative: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as RollInitiativeParameters;

  console.log('[RollInitiativeHandler] Validating initiative roll:', {
    participants: params.participants,
    requestId: request.id
  });

  // Check if we have an active encounter
  if (!gameState.currentEncounter) {
    return {
      valid: false,
      error: {
        code: 'NO_ACTIVE_ENCOUNTER',
        message: 'No active encounter for initiative roll'
      }
    };
  }

  // Validate participants if specific ones are provided
  if (params.participants && params.participants.length > 0) {
    const encounterTokens = gameState.currentEncounter.tokens || {};
    const encounterDocuments = Object.values(gameState.documents).filter(
      doc => doc.documentType === 'character' || doc.documentType === 'actor'
    );
    
    for (const participantId of params.participants) {
      // Check if participant exists either as a token or document
      const tokenExists = Object.values(encounterTokens).some(token => 
        token.id === participantId || token.documentId === participantId
      );
      const documentExists = encounterDocuments.some(doc => doc.id === participantId);
      
      if (!tokenExists && !documentExists) {
        return {
          valid: false,
          error: {
            code: 'PARTICIPANT_NOT_FOUND',
            message: `Participant not found: ${participantId}`
          }
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Execute initiative rolling using direct state mutation
 */
const executeRollInitiative: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as RollInitiativeParameters;

  console.log('[RollInitiativeHandler] Executing initiative roll:', {
    participants: params.participants,
    requestId: request.id
  });

  // Initialize turn manager if it doesn't exist
  if (!draft.turnManager) {
    draft.turnManager = {
      participants: [],
      isActive: false,
      currentTurn: 0,
      round: 1
    };
  }

  // Get the appropriate plugin for initiative calculation
  const gameSystemPlugin = pluginRegistry.getGameSystemPlugin(draft.campaign?.pluginId || 'dnd-5e-2024');
  const turnManagerPlugin = gameSystemPlugin?.turnManager;
  
  if (!turnManagerPlugin) {
    console.warn('[RollInitiativeHandler] No turn manager plugin found, using simple rolling');
  }

  // Generate turn order participants from encounter participants only
  let participants = [];
  const encounterParticipants = draft.currentEncounter?.participants || [];
  const tokens = draft.currentEncounter?.tokens || {};

  if (encounterParticipants.length === 0) {
    console.warn('[RollInitiativeHandler] No encounter participants found - cannot roll initiative');
    return;
  }

  for (const participantId of encounterParticipants) {
    // Skip if specific participants were requested and this participant isn't included
    if (params.participants && params.participants.length > 0) {
      if (!params.participants.includes(participantId)) {
        // Also check token IDs for backward compatibility
        const token = Object.values(tokens).find(t => t.documentId === participantId);
        if (!token || !params.participants.includes(token.id)) {
          continue;
        }
      }
    }

    const document = draft.documents[participantId];
    if (!document) {
      console.warn(`[RollInitiativeHandler] Document not found for participant: ${participantId}`);
      continue;
    }

    const token = Object.values(tokens).find(t => t.documentId === participantId);
    
    participants.push({
      id: token?.id || `participant_${participantId}`,
      name: document.name,
      tokenId: token?.id,
      actorId: participantId,
      turnOrder: 0, // Will be calculated by plugin
      hasActed: false
    });
  }

  // Use plugin to calculate initiative if available, otherwise use simple rolling
  if (turnManagerPlugin && turnManagerPlugin.supportsAutomaticCalculation()) {
    console.log('[RollInitiativeHandler] Using plugin to calculate initiative');
    participants = await turnManagerPlugin.calculateInitiative(participants);
  } else {
    console.log('[RollInitiativeHandler] Using simple initiative rolling');
    // Fallback to simple d20 rolling
    participants = participants.map(participant => ({
      ...participant,
      turnOrder: Math.floor(Math.random() * 20) + 1
    }));
    // Sort by initiative roll (higher goes first)
    participants.sort((a, b) => b.turnOrder - a.turnOrder);
  }

  // Update turn manager
  draft.turnManager.participants = participants;
  draft.turnManager.isActive = true;
  draft.turnManager.currentTurn = 0;
  draft.turnManager.round = 1;

  console.log('[RollInitiativeHandler] Initiative rolled successfully:', {
    participantCount: participants.length,
    turnOrder: participants.map(p => ({ name: p.name, initiative: p.turnOrder })),
    requestId: request.id
  });
}

/**
 * Core roll-initiative action handler
 */
export const rollInitiativeActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  gmOnly: true, // Only GMs can roll initiative
  validate: validateRollInitiative,
  execute: executeRollInitiative,
  approvalMessage: async (request) => {
    const params = request.parameters as RollInitiativeParameters;
    const participantCount = params.participants?.length || 'all participants';
    return `wants to roll initiative for ${participantCount}`;
  }
};
/**
 * Roll Initiative Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes initiative rolling using Immer for direct state mutations.
 */

import type { GameActionRequest, RollInitiativeParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';

/**
 * Validate roll initiative request
 */
async function validateRollInitiative(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ValidationResult> {
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
    const encounterTokens = gameState.currentEncounter.tokens || [];
    const encounterDocuments = Object.values(gameState.documents).filter(
      doc => doc.documentType === 'character' || doc.documentType === 'actor'
    );
    
    for (const participantId of params.participants) {
      // Check if participant exists either as a token or document
      const tokenExists = encounterTokens.some(token => 
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
async function executeRollInitiative(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): Promise<void> {
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

  // Generate turn order participants from encounter tokens and characters
  const participants = [];
  
  if (draft.currentEncounter?.tokens) {
    for (const token of draft.currentEncounter.tokens) {
      // Skip if specific participants were requested and this token isn't included
      if (params.participants && params.participants.length > 0) {
        if (!params.participants.includes(token.id) && !params.participants.includes(token.documentId || '')) {
          continue;
        }
      }
      
      // Roll initiative (d20 + dex modifier, for now just random 1-20)
      const initiativeRoll = Math.floor(Math.random() * 20) + 1;
      
      participants.push({
        id: `participant_${token.id}`,
        name: token.name,
        tokenId: token.id,
        actorId: token.documentId,
        turnOrder: initiativeRoll,
        hasActed: false
      });
    }
  }

  // If no specific participants were requested, include characters not represented by tokens
  if (!params.participants || params.participants.length === 0) {
    const tokenDocumentIds = new Set(
      draft.currentEncounter?.tokens?.map(t => t.documentId).filter(Boolean) || []
    );
    
    for (const document of Object.values(draft.documents)) {
      if ((document.documentType === 'character' || document.documentType === 'actor') && 
          !tokenDocumentIds.has(document.id)) {
        
        const initiativeRoll = Math.floor(Math.random() * 20) + 1;
        
        participants.push({
          id: `participant_${document.id}`,
          name: document.name,
          actorId: document.id,
          turnOrder: initiativeRoll,
          hasActed: false
        });
      }
    }
  }

  // Sort participants by initiative roll (higher goes first)
  participants.sort((a, b) => b.turnOrder - a.turnOrder);

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
export const rollInitiativeActionHandler: ActionHandler = {
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
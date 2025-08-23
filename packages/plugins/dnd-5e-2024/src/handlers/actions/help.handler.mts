/**
 * D&D 5e Help Action Handler
 * 
 * Handles the "Help" action in D&D 5e, which allows a character to aid another creature
 * in completing a task or attacking. The helped creature gains advantage on their next
 * ability check or attack roll.
 */

import type { 
  GameActionRequest, 
  ServerGameStateWithVirtuals 
} from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction, 
  findPlayerCharacter, 
  findPlayerCharacterInDraft
} from '../../utils/action-economy.mjs';

/**
 * Validate D&D 5e Help action
 */
export async function validateDnDHelp(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e HelpHandler] Validating Help action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as {
    targetId?: string; // ID of the character being helped
    helpType?: 'ability-check' | 'attack'; // Type of help being provided
  };

  // Find the character for this player (the helper)
  const character = findPlayerCharacter(request.playerId, gameState);
  
  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for help action' } 
    };
  }

  console.log('[DnD5e HelpHandler] Found helper character:', {
    characterName: character.name,
    characterId: character.id
  });

  // Validate target if specified
  if (params.targetId) {
    const target = gameState.documents[params.targetId];
    if (!target) {
      return {
        valid: false,
        error: {
          code: 'TARGET_NOT_FOUND',
          message: 'Target character not found for help action'
        }
      };
    }

    // TODO: In a full implementation, check if target is within 5 feet
    // For now, we'll assume positioning is handled elsewhere
    
    console.log('[DnD5e HelpHandler] Found target character:', {
      targetName: target.name,
      targetId: target.id
    });
  }

  // Use action economy utility to validate the help action
  return await validateActionEconomy('action', character, gameState, 'Help');
}

/**
 * Execute D&D 5e Help action - consume action and apply advantage to target
 */
export function executeDnDHelp(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e HelpHandler] Executing Help action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  const params = request.parameters as {
    targetId?: string;
    helpType?: 'ability-check' | 'attack';
  };

  // Find the character in the draft state (the helper)
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e HelpHandler] Helper character not found during help execution');
    return;
  }

  // Consume the action using the utility function
  consumeAction('action', character, 'Help');

  // Apply help effect to target if specified
  if (params.targetId) {
    const target = draft.documents[params.targetId];
    if (target) {
      // Initialize target state if needed
      if (!target.state) target.state = {};
      if (!target.state.turnState) target.state.turnState = {};

      // Store help information in target's turn state
      // This can be checked when the target makes their next roll
      if (!target.state.turnState.helpReceived) {
        target.state.turnState.helpReceived = [];
      }

      target.state.turnState.helpReceived.push({
        helperId: character.id,
        helperName: character.name,
        helpType: params.helpType || 'ability-check',
        grantedAt: Date.now()
      });

      console.log('[DnD5e HelpHandler] Applied help effect:', {
        helperName: character.name,
        targetName: target.name,
        helpType: params.helpType || 'ability-check'
      });
    }
  }

  console.log('[DnD5e HelpHandler] Help action executed successfully:', {
    helperName: character.name,
    helperId: character.id,
    targetId: params.targetId,
    helpType: params.helpType
  });
}

/**
 * Utility function to check if a character has received help
 * Can be used by attack and ability check systems
 */
export function hasReceivedHelp(character: any, helpType?: 'ability-check' | 'attack'): boolean {
  const turnState = character?.state?.turnState;
  const helpReceived = turnState?.helpReceived || [];
  
  if (helpType) {
    return helpReceived.some((help: any) => help.helpType === helpType);
  }
  
  return helpReceived.length > 0;
}

/**
 * Utility function to consume help (remove from character state after use)
 */
export function consumeHelp(character: any, helpType?: 'ability-check' | 'attack'): void {
  const turnState = character?.state?.turnState;
  if (!turnState?.helpReceived) return;

  if (helpType) {
    // Remove specific type of help
    const index = turnState.helpReceived.findIndex((help: any) => help.helpType === helpType);
    if (index !== -1) {
      turnState.helpReceived.splice(index, 1);
    }
  } else {
    // Remove first help received
    turnState.helpReceived.shift();
  }
}

/**
 * D&D 5e Help Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndHelpHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDHelp as (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => ActionValidationResult,
  execute: executeDnDHelp,
  approvalMessage: (request) => {
    const params = request.parameters as { targetId?: string; helpType?: string };
    const target = params.targetId ? ` ${params.targetId}` : ' an ally';
    const helpType = params.helpType === 'attack' ? 'with an attack' : 'with an ability check';
    return `wants to help${target} ${helpType}`;
  }
};
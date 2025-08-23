/**
 * D&D 5e Dodge Action Handler
 * 
 * Handles the "Dodge" action in D&D 5e, which grants advantage on Dexterity saving throws
 * and causes attack rolls against the character to have disadvantage until the start of
 * their next turn. Uses action tracking rather than conditions.
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
 * Validate D&D 5e Dodge action
 */
export async function validateDnDDodge(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e DodgeHandler] Validating Dodge action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = findPlayerCharacter(request.playerId, gameState);
  
  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for dodge action' } 
    };
  }

  console.log('[DnD5e DodgeHandler] Found character for dodge:', {
    characterName: character.name,
    characterId: character.id
  });

  // Check if character has already used the Dodge action this turn
  const turnState = character.state?.turnState;
  const actionsUsed = turnState?.actionsUsed || [];
  
  if (actionsUsed.includes('Dodge')) {
    return {
      valid: false,
      error: {
        code: 'ACTION_ALREADY_USED',
        message: `${character.name} has already used the Dodge action this turn`
      }
    };
  }

  // Use action economy utility to validate the dodge action
  return await validateActionEconomy('action', character, gameState, 'Dodge');
}

/**
 * Execute D&D 5e Dodge action - consume action and track dodge state
 */
export function executeDnDDodge(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e DodgeHandler] Executing Dodge action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  // Find the character in the draft state
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e DodgeHandler] Character not found during dodge execution');
    return;
  }

  // Consume the action using the utility function
  // This will add "Dodge" to the actionsUsed array, which can be checked
  // during attack and saving throw resolution
  consumeAction('action', character, 'Dodge');

  console.log('[DnD5e DodgeHandler] Dodge action executed successfully:', {
    characterName: character.name,
    characterId: character.id,
    note: 'Attacks against this character now have disadvantage, character has advantage on Dex saves'
  });
}

/**
 * Utility function to check if a character used the Dodge action this turn
 * Can be used by attack and saving throw systems
 */
export function hasUsedDodgeAction(character: any): boolean {
  const turnState = character?.state?.turnState;
  const actionsUsed = turnState?.actionsUsed || [];
  return actionsUsed.includes('Dodge');
}

/**
 * D&D 5e Dodge Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndDodgeHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDDodge as (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => ActionValidationResult,
  execute: executeDnDDodge,
  approvalMessage: () => "wants to take the Dodge action"
};
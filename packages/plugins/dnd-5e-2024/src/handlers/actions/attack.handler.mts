/**
 * D&D 5e Attack Action Handler
 * 
 * Handles the "Attack" action in D&D 5e, enforcing action economy rules.
 * Works with the existing weapon system by consuming the action before weapon rolls.
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
 * Validate D&D 5e Attack action
 */
export function validateDnDAttack(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e AttackHandler] Validating Attack action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = findPlayerCharacter(request.playerId, gameState);
  
  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for attack' } 
    };
  }

  console.log('[DnD5e AttackHandler] Found character for attack:', {
    characterName: character.name,
    characterId: character.id
  });

  // Use action economy utility to validate the attack action
  return validateActionEconomy('action', character, gameState, 'Attack');
}

/**
 * Execute D&D 5e Attack action - consume the action economy
 */
export function executeDnDAttack(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e AttackHandler] Executing Attack action consumption:', {
    playerId: request.playerId,
    requestId: request.id
  });

  // Find the character in the draft state
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e AttackHandler] Character not found during attack execution');
    return;
  }

  // Consume the action using the utility function
  // This will mutate the draft state directly
  consumeAction('action', character, 'Attack');

  console.log('[DnD5e AttackHandler] Attack action consumed successfully:', {
    characterName: character.name,
    characterId: character.id
  });
}

/**
 * D&D 5e Attack Action Handler
 * 
 * Priority 50 - runs before weapon handlers (which typically have priority 100+)
 * This ensures action economy is validated and consumed before weapon rolls occur.
 */
export const dndAttackHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 50, // Before weapon-specific handlers
  validate: validateDnDAttack,
  execute: executeDnDAttack,
  approvalMessage: () => "wants to make an Attack"
};
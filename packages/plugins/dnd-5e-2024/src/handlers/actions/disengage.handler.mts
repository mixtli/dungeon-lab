/**
 * D&D 5e Disengage Action Handler
 * 
 * Handles the "Disengage" action in D&D 5e, which allows a character to move without
 * provoking opportunity attacks for the rest of their turn. Uses action tracking
 * rather than conditions.
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
  findPlayerCharacterInDraft,
  type DnDActionType
} from '../../utils/action-economy.mjs';

/**
 * Validate D&D 5e Disengage action
 */
export async function validateDnDDisengage(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e DisengageHandler] Validating Disengage action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as {
    actionType?: 'action' | 'bonus-action'; // Allow class features like Cunning Action
  };

  // Find the character for this player
  const character = findPlayerCharacter(request.playerId, gameState);
  
  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for disengage action' } 
    };
  }

  console.log('[DnD5e DisengageHandler] Found character for disengage:', {
    characterName: character.name,
    characterId: character.id
  });

  // Determine action type (default to main action, allow bonus action for rogues etc.)
  const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

  // Check if character has already used the Disengage action this turn
  const turnState = character.state?.turnState;
  const actionsUsed = turnState?.actionsUsed || [];
  
  if (actionsUsed.includes('Disengage')) {
    return {
      valid: false,
      error: {
        code: 'ACTION_ALREADY_USED',
        message: `${character.name} has already used the Disengage action this turn`
      }
    };
  }

  // Use action economy utility to validate the disengage action
  return await validateActionEconomy(actionType, character, gameState, 'Disengage');
}

/**
 * Execute D&D 5e Disengage action - consume action and track disengage state
 */
export function executeDnDDisengage(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e DisengageHandler] Executing Disengage action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  const params = request.parameters as {
    actionType?: 'action' | 'bonus-action';
  };

  // Find the character in the draft state
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e DisengageHandler] Character not found during disengage execution');
    return;
  }

  // Determine action type
  const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

  // Consume the action using the utility function
  // This will add "Disengage" to the actionsUsed array, which can be checked
  // during movement and opportunity attack resolution
  consumeAction(actionType, character, 'Disengage');

  console.log('[DnD5e DisengageHandler] Disengage action executed successfully:', {
    characterName: character.name,
    characterId: character.id,
    actionType,
    note: 'Character can now move without provoking opportunity attacks'
  });
}

/**
 * Utility function to check if a character used the Disengage action this turn
 * Can be used by movement and opportunity attack systems
 */
export function hasUsedDisengageAction(character: any): boolean {
  const turnState = character?.state?.turnState;
  const actionsUsed = turnState?.actionsUsed || [];
  return actionsUsed.includes('Disengage');
}

/**
 * D&D 5e Disengage Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndDisengageHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDDisengage,
  execute: executeDnDDisengage,
  approvalMessage: (request) => {
    const params = request.parameters as { actionType?: string };
    const actionType = params.actionType === 'bonus-action' ? 'bonus action' : 'action';
    return `wants to use ${actionType} to Disengage`;
  }
};
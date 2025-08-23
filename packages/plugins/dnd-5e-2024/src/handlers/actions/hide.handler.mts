/**
 * D&D 5e Hide Action Handler
 * 
 * Handles the "Hide" action in D&D 5e, which allows characters to attempt to become
 * invisible through a Dexterity (Stealth) check. Applies the invisible condition on success.
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
import { ConditionService } from '../../services/condition.service.mjs';

/**
 * Validate D&D 5e Hide action
 */
export async function validateDnDHide(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e HideHandler] Validating Hide action:', {
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
      error: { code: 'NO_CHARACTER', message: 'Character not found for hide attempt' } 
    };
  }

  console.log('[DnD5e HideHandler] Found character for hide:', {
    characterName: character.name,
    characterId: character.id
  });

  // Determine action type (default to main action, allow bonus action for rogues etc.)
  const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

  // Check if character is already invisible
  const currentConditions = (character.state?.conditions || []);
  for (const conditionInstance of currentConditions) {
    const conditionDoc = await ConditionService.getCondition(conditionInstance.conditionId);
    if (conditionDoc?.slug === 'invisible') {
      return {
        valid: false,
        error: {
          code: 'ALREADY_HIDDEN',
          message: `${character.name} is already invisible`
        }
      };
    }
  }

  // Use action economy utility to validate the hide action
  return await validateActionEconomy(actionType, character, gameState, 'Hide');
}

/**
 * Execute D&D 5e Hide action - make stealth check and apply invisible condition on success
 */
export async function executeDnDHide(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): Promise<void> {
  console.log('[DnD5e HideHandler] Executing Hide action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  const params = request.parameters as {
    actionType?: 'action' | 'bonus-action';
    stealthRoll?: number; // If roll was made client-side
    stealthDC?: number; // Target DC for the check
  };

  // Find the character in the draft state
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e HideHandler] Character not found during hide execution');
    return;
  }

  // Determine action type
  const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

  // Consume the action using the utility function
  consumeAction(actionType, character, 'Hide');

  // Apply invisible condition (assuming stealth check succeeds for now)
  // In a full implementation, this would involve rolling Dexterity (Stealth)
  // and comparing against a DC or opposing Wisdom (Perception) checks
  
  // Get the invisible condition document by slug
  const invisibleCondition = await ConditionService.getConditionBySlug('invisible');
  if (invisibleCondition) {
    // Initialize conditions if needed
    if (!character.state) character.state = {};
    if (!character.state.conditions) character.state.conditions = [];

    // Create and add condition instance
    const conditionInstance = ConditionService.createConditionInstance(
      invisibleCondition.id,
      'Hide Action',
      1,
      { 
        addedVia: 'hide-action',
        stealthRoll: params.stealthRoll,
        stealthDC: params.stealthDC 
      }
    );

    const conditions = character.state.conditions as any[];
    conditions.push(conditionInstance);

    console.log('[DnD5e HideHandler] Applied invisible condition:', {
      characterName: character.name,
      conditionName: invisibleCondition.name,
      source: 'Hide Action'
    });
  } else {
    console.error('[DnD5e HideHandler] Could not find invisible condition document');
  }

  console.log('[DnD5e HideHandler] Hide action executed successfully:', {
    characterName: character.name,
    characterId: character.id,
    actionType
  });
}

/**
 * D&D 5e Hide Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndHideHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDHide as (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => ActionValidationResult,
  execute: executeDnDHide as (request: GameActionRequest, draft: ServerGameStateWithVirtuals) => void,
  approvalMessage: (request) => {
    const params = request.parameters as { actionType?: string };
    const actionType = params.actionType === 'bonus-action' ? 'bonus action' : 'action';
    return `wants to use ${actionType} to Hide`;
  }
};
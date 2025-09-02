/**
 * D&D 5e Dodge Action Handler
 * 
 * Handles the "Dodge" action in D&D 5e, which grants advantage on Dexterity saving throws
 * and causes attack rolls against the character to have disadvantage until the start of
 * their next turn. Uses action tracking rather than conditions.
 */

import type { 
  GameActionRequest, 
  ServerGameStateWithVirtuals,
  ICharacter,
  IActor
} from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction
} from '../../utils/action-economy.mjs';
import { hasValidActor, getActor, hasValidActorToken, getValidatedActor } from '../../utils/actor-validation.mjs';

/**
 * Validate D&D 5e Dodge action
 */
const validateDnDDodge: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e DodgeHandler] Validating Dodge action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    parameters: request.parameters
  });

  try {
    // Validate actor exists using utility
    if (!hasValidActor(request, gameState)) {
      return {
        valid: false,
        error: { code: 'ACTOR_NOT_FOUND', message: 'Actor not found or Actor ID not provided' }
      };
    }
    const actor = getActor(request, gameState)!; // We know it exists from validation

    // Validate token if provided using utility
    if (!hasValidActorToken(request, gameState)) {
      return {
        valid: false,
        error: { code: 'INVALID_TOKEN', message: 'Actor token not found or does not match actor' }
      };
    }

    console.log('[DnD5e DodgeHandler] Found actor for dodge:', {
      actorName: actor.name,
      actorId: actor.id
    });

    // Check if character has already used the Dodge action this turn
    const turnState = actor.state?.turnState;
    const actionsUsed = turnState?.actionsUsed || [];
    
    if (actionsUsed.includes('Dodge')) {
      return {
        valid: false,
        error: {
          code: 'ACTION_ALREADY_USED',
          message: `${actor.name} has already used the Dodge action this turn`
        }
      };
    }

    // Add type guard to ensure actor can perform actions
    if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
      return {
        valid: false,
        error: { code: 'INVALID_ACTOR_TYPE', message: `Document ${request.actorId} cannot perform actions (type: ${actor.documentType})` }
      };
    }

    // Cast to proper type after validation
    const actionActor = actor as ICharacter | IActor;

    // Use action economy utility to validate the dodge action
    console.log('[DnD5e DodgeHandler] Validation successful for actor:', actor.name);
    return await validateActionEconomy('action', actionActor, gameState, 'Dodge');

  } catch (error) {
    console.error('[DnD5e DodgeHandler] Validation failed:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Execute D&D 5e Dodge action - consume action and track dodge state
 */
const executeDnDDodge: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e DodgeHandler] Executing Dodge action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    requestId: request.id
  });

  try {
    // Get validated actor using utility
    const actor = getValidatedActor(request, draft, 'dodge action');

    // Add type guard to ensure actor can perform actions
    if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
      throw new Error(`Document ${request.actorId} cannot perform actions (type: ${actor.documentType})`);
    }

    // Cast to proper type after validation
    const actionActor = actor as ICharacter | IActor;

    // Consume the action using the utility function
    // This will add "Dodge" to the actionsUsed array, which can be checked
    // during attack and saving throw resolution
    consumeAction('action', actionActor, 'Dodge');

    console.log('[DnD5e DodgeHandler] Dodge action executed successfully:', {
      actorName: actor.name,
      actorId: actor.id,
      note: 'Attacks against this character now have disadvantage, character has advantage on Dex saves'
    });
  } catch (error) {
    console.error('[DnD5e DodgeHandler] Handler execution failed:', error);
    throw error;
  }
}

/**
 * Utility function to check if a character used the Dodge action this turn
 * Can be used by attack and saving throw systems
 */
export function hasUsedDodgeAction(character: { state?: { turnState?: { actionsUsed?: string[] } } }): boolean {
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
  validate: validateDnDDodge,
  execute: executeDnDDodge,
  approvalMessage: async () => "wants to take the Dodge action"
};

// Export individual functions for compatibility
export { validateDnDDodge, executeDnDDodge };
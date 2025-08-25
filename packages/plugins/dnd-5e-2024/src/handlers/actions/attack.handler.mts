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
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction
} from '../../utils/action-economy.mjs';

/**
 * Validate D&D 5e Attack action
 */
export const validateDnDAttack: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e AttackHandler] Validating Attack action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    parameters: request.parameters
  });

  try {
    // Get actor from required actorId (always available)
    const actor = gameState.documents[request.actorId];
    if (!actor) {
      return {
        valid: false,
        error: { code: 'ACTOR_NOT_FOUND', message: 'Actor not found' }
      };
    }

    // Get token if provided (for positioning/range calculations)
    let actorToken = null;
    if (request.actorTokenId) {
      actorToken = gameState.currentEncounter?.tokens?.[request.actorTokenId!];
      if (!actorToken) {
        return {
          valid: false,
          error: { code: 'TOKEN_NOT_FOUND', message: 'Actor token not found' }
        };
      }
      // Validate token represents the specified actor
      if (actorToken.documentId !== request.actorId) {
        return {
          valid: false,
          error: { code: 'TOKEN_MISMATCH', message: 'Token does not represent the specified actor' }
        };
      }
    }

    console.log('[DnD5e AttackHandler] Found actor for attack:', {
      actorName: actor.name,
      actorId: actor.id
    });

    // Use action economy utility to validate the attack action
    console.log('[DnD5e AttackHandler] Validation successful for actor:', actor.name);
    return await validateActionEconomy('action', actor, gameState, 'Attack');

  } catch (error) {
    console.error('[DnD5e AttackHandler] Validation failed:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Execute D&D 5e Attack action - consume the action economy
 */
export const executeDnDAttack: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e AttackHandler] Executing Attack action consumption:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    requestId: request.id
  });

  try {
    // Get actor from required actorId (always available)
    const actor = draft.documents[request.actorId];
    if (!actor) {
      throw new Error('Actor not found');
    }

    // Consume the action using the utility function
    // This will mutate the draft state directly
    consumeAction('action', actor, 'Attack');

    console.log('[DnD5e AttackHandler] Attack action consumed successfully:', {
      actorName: actor.name,
      actorId: actor.id
    });
  } catch (error) {
    console.error('[DnD5e AttackHandler] Handler execution failed:', error);
    throw error;
  }
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
  approvalMessage: async () => "wants to make an Attack"
};
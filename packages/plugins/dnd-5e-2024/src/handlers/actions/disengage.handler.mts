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
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction,
  type DnDActionType
} from '../../utils/action-economy.mjs';

/**
 * Validate D&D 5e Disengage action
 */
const validateDnDDisengage: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e DisengageHandler] Validating Disengage action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    parameters: request.parameters
  });

  try {
    const params = request.parameters as {
      actionType?: 'action' | 'bonus-action'; // Allow class features like Cunning Action
    };

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

    console.log('[DnD5e DisengageHandler] Found actor for disengage:', {
      actorName: actor.name,
      actorId: actor.id
    });

    // Determine action type (default to main action, allow bonus action for rogues etc.)
    const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

    // Check if character has already used the Disengage action this turn
    const turnState = actor.state?.turnState;
    const actionsUsed = turnState?.actionsUsed || [];
    
    if (actionsUsed.includes('Disengage')) {
      return {
        valid: false,
        error: {
          code: 'ACTION_ALREADY_USED',
          message: `${actor.name} has already used the Disengage action this turn`
        }
      };
    }

    // Use action economy utility to validate the disengage action
    console.log('[DnD5e DisengageHandler] Validation successful for actor:', actor.name);
    return await validateActionEconomy(actionType, actor, gameState, 'Disengage');

  } catch (error) {
    console.error('[DnD5e DisengageHandler] Validation failed:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Execute D&D 5e Disengage action - consume action and track disengage state
 */
const executeDnDDisengage: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e DisengageHandler] Executing Disengage action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    requestId: request.id
  });

  try {
    const params = request.parameters as {
      actionType?: 'action' | 'bonus-action';
    };

    // Get actor from required actorId (always available)
    const actor = draft.documents[request.actorId];
    if (!actor) {
      throw new Error('Actor not found');
    }

    // Determine action type
    const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

    // Consume the action using the utility function
    // This will add "Disengage" to the actionsUsed array, which can be checked
    // during movement and opportunity attack resolution
    consumeAction(actionType, actor, 'Disengage');

    console.log('[DnD5e DisengageHandler] Disengage action executed successfully:', {
      actorName: actor.name,
      actorId: actor.id,
      actionType,
      note: 'Character can now move without provoking opportunity attacks'
    });
  } catch (error) {
    console.error('[DnD5e DisengageHandler] Handler execution failed:', error);
    throw error;
  }
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
  approvalMessage: async (request) => {
    const params = request.parameters as { actionType?: string };
    const actionType = params.actionType === 'bonus-action' ? 'bonus action' : 'action';
    return `wants to use ${actionType} to Disengage`;
  }
};

// Export individual functions for compatibility
export { validateDnDDisengage, executeDnDDisengage };
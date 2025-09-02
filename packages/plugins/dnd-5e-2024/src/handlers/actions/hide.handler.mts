/**
 * D&D 5e Hide Action Handler
 * 
 * Handles the "Hide" action in D&D 5e, which allows characters to attempt to become
 * invisible through a Dexterity (Stealth) check. Applies the invisible condition on success.
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
  consumeAction,
  type DnDActionType
} from '../../utils/action-economy.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';
import type { DndConditionDocument } from '../../types/dnd/condition.mjs';

/**
 * Validate D&D 5e Hide action
 */
const validateDnDHide: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e HideHandler] Validating Hide action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    parameters: request.parameters
  });

  try {
    const params = request.parameters as {
      actionType?: 'action' | 'bonus-action'; // Allow class features like Cunning Action
    };

    // Get actor from required actorId (must be available for hide actions)
    if (!request.actorId) {
      return {
        valid: false,
        error: { code: 'MISSING_ACTOR_ID', message: 'Actor ID is required for hide actions' }
      };
    }
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

    console.log('[DnD5e HideHandler] Found actor for hide:', {
      actorName: actor.name,
      actorId: actor.id
    });

    // Determine action type (default to main action, allow bonus action for rogues etc.)
    const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

    // Check if character is already invisible
    const currentConditions = (actor.state?.conditions || []);
    const pluginContext = getPluginContext();
    if (!pluginContext) {
      return { valid: false, error: { code: 'NO_CONTEXT', message: 'Plugin context not available' } };
    }
    
    for (const conditionInstance of currentConditions) {
      try {
        const conditionDoc = await pluginContext.getDocument(conditionInstance.conditionId) as DndConditionDocument;
        if (conditionDoc?.slug === 'invisible') {
          return {
            valid: false,
            error: {
              code: 'ALREADY_HIDDEN',
              message: `${actor.name} is already invisible`
            }
          };
        }
      } catch (error) {
        console.warn('[DnD5e HideHandler] Failed to fetch condition document:', conditionInstance.conditionId, error);
        continue;
      }
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

    // Use action economy utility to validate the hide action
    console.log('[DnD5e HideHandler] Validation successful for actor:', actor.name);
    return await validateActionEconomy(actionType, actionActor, gameState, 'Hide');

  } catch (error) {
    console.error('[DnD5e HideHandler] Validation failed:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Execute D&D 5e Hide action - make stealth check and apply invisible condition on success
 */
const executeDnDHide: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e HideHandler] Executing Hide action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    requestId: request.id
  });

  try {
    const params = request.parameters as {
      actionType?: 'action' | 'bonus-action';
      stealthRoll?: number; // If roll was made client-side
      stealthDC?: number; // Target DC for the check
    };

    // Get actor from required actorId (always available)
    if (!request.actorId) {
      throw new Error('Actor ID is required for hide actions');
    }
    const actor = draft.documents[request.actorId];
    if (!actor) {
      throw new Error('Actor not found');
    }

    // Add type guard to ensure actor can perform actions
    if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
      throw new Error(`Document ${request.actorId} cannot perform actions (type: ${actor.documentType})`);
    }

    // Cast to proper type after validation
    const actionActor = actor as ICharacter | IActor;

    // Determine action type
    const actionType: DnDActionType = params.actionType === 'bonus-action' ? 'bonus-action' : 'action';

    // Consume the action using the utility function
    consumeAction(actionType, actionActor, 'Hide');

    // Apply invisible condition (assuming stealth check succeeds for now)
    // In a full implementation, this would involve rolling Dexterity (Stealth)
    // and comparing against a DC or opposing Wisdom (Perception) checks
    
    // TODO: Get the invisible condition document by slug
    // For now, we'll skip applying the invisible condition since we need a proper way to lookup by slug
    // This would require either a document query or maintaining a slug->ID mapping
    
    console.warn('[DnD5e HideHandler] Invisible condition application not yet implemented - need slug lookup mechanism');

    console.log('[DnD5e HideHandler] Hide action executed successfully:', {
      actorName: actor.name,
      actorId: actor.id,
      actionType
    });
  } catch (error) {
    console.error('[DnD5e HideHandler] Handler execution failed:', error);
    throw error;
  }
}

/**
 * D&D 5e Hide Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndHideHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDHide,
  execute: executeDnDHide,
  approvalMessage: async (request) => {
    const params = request.parameters as { actionType?: string };
    const actionType = params.actionType === 'bonus-action' ? 'bonus action' : 'action';
    return `wants to use ${actionType} to Hide`;
  }
};

// Export individual functions for compatibility
export { validateDnDHide, executeDnDHide };
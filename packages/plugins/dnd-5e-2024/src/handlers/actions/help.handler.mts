/**
 * D&D 5e Help Action Handler
 * 
 * Handles the "Help" action in D&D 5e, which allows a character to aid another creature
 * in completing a task or attacking. The helped creature gains advantage on their next
 * ability check or attack roll.
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

/**
 * Validate D&D 5e Help action
 */
const validateDnDHelp: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e HelpHandler] Validating Help action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    parameters: request.parameters
  });

  try {
    const params = request.parameters as {
      targetId?: string; // ID of the character being helped
      helpType?: 'ability-check' | 'attack'; // Type of help being provided
    };

    // Get actor from required actorId (must be available for help actions)
    if (!request.actorId) {
      return {
        valid: false,
        error: { code: 'MISSING_ACTOR_ID', message: 'Actor ID is required for help actions' }
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

    console.log('[DnD5e HelpHandler] Found helper actor:', {
      actorName: actor.name,
      actorId: actor.id
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

    // Add type guard to ensure actor can perform actions
    if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
      return {
        valid: false,
        error: { code: 'INVALID_ACTOR_TYPE', message: `Document ${request.actorId} cannot perform actions (type: ${actor.documentType})` }
      };
    }

    // Cast to proper type after validation
    const actionActor = actor as ICharacter | IActor;

    // Use action economy utility to validate the help action
    console.log('[DnD5e HelpHandler] Validation successful for actor:', actor.name);
    return await validateActionEconomy('action', actionActor, gameState, 'Help');

  } catch (error) {
    console.error('[DnD5e HelpHandler] Validation failed:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Execute D&D 5e Help action - consume action and apply advantage to target
 */
const executeDnDHelp: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e HelpHandler] Executing Help action:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    requestId: request.id
  });

  try {
    const params = request.parameters as {
      targetId?: string;
      helpType?: 'ability-check' | 'attack';
    };

    // Get actor from required actorId (always available)
    if (!request.actorId) {
      throw new Error('Actor ID is required for help actions');
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

    // Consume the action using the utility function
    consumeAction('action', actionActor, 'Help');

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
          helperId: actor.id,
          helperName: actor.name,
          helpType: params.helpType || 'ability-check',
          grantedAt: Date.now()
        });

        console.log('[DnD5e HelpHandler] Applied help effect:', {
          helperName: actor.name,
          targetName: target.name,
          helpType: params.helpType || 'ability-check'
        });
      }
    }

    console.log('[DnD5e HelpHandler] Help action executed successfully:', {
      helperName: actor.name,
      helperId: actor.id,
      targetId: params.targetId,
      helpType: params.helpType
    });
  } catch (error) {
    console.error('[DnD5e HelpHandler] Handler execution failed:', error);
    throw error;
  }
}

/**
 * Utility function to check if a character has received help
 * Can be used by attack and ability check systems
 */
export function hasReceivedHelp(character: ICharacter | IActor, helpType?: 'ability-check' | 'attack'): boolean {
  const turnState = character?.state?.turnState;
  const helpReceived = turnState?.helpReceived || [];
  
  if (helpType) {
    return helpReceived.some((help: { helpType: string }) => help.helpType === helpType);
  }
  
  return helpReceived.length > 0;
}

/**
 * Utility function to consume help (remove from character state after use)
 */
export function consumeHelp(character: ICharacter | IActor, helpType?: 'ability-check' | 'attack'): void {
  const turnState = character?.state?.turnState;
  if (!turnState?.helpReceived) return;

  if (helpType) {
    // Remove specific type of help
    const index = turnState.helpReceived.findIndex((help: { helpType: string }) => help.helpType === helpType);
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
  validate: validateDnDHelp,
  execute: executeDnDHelp,
  approvalMessage: async (request) => {
    const params = request.parameters as { targetId?: string; helpType?: string };
    const target = params.targetId ? ` ${params.targetId}` : ' an ally';
    const helpType = params.helpType === 'attack' ? 'with an attack' : 'with an ability check';
    return `wants to help${target} ${helpType}`;
  }
};

// Export individual functions for compatibility
export { validateDnDHelp, executeDnDHelp };
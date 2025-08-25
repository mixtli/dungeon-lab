/**
 * D&D 5e Search Action Handler
 * 
 * Handles the "Search" action in D&D 5e, which allows a character to make a 
 * Wisdom (Perception) or Intelligence (Investigation) check to find hidden
 * objects, secret doors, traps, or creatures.
 */

import type { 
  GameActionRequest, 
  ServerGameStateWithVirtuals 
} from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction
} from '../../utils/action-economy.mjs';

/**
 * Validate D&D 5e Search action
 */
const validateDnDSearch: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e SearchHandler] Validating Search action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as {
    checkType?: 'perception' | 'investigation'; // Type of ability check
    targetArea?: string; // Area or object being searched
  };

  // Get actor from required actorId (always available)
  const actor = gameState.documents[request.actorId];
  
  if (!actor) {
    return { 
      valid: false, 
      error: { code: 'ACTOR_NOT_FOUND', message: 'Actor not found' } 
    };
  }

  console.log('[DnD5e SearchHandler] Found actor for search:', {
    actorName: actor.name,
    actorId: actor.id,
    checkType: params.checkType || 'perception'
  });

  // Use action economy utility to validate the search action
  return await validateActionEconomy('action', actor, gameState, 'Search');
}

/**
 * Execute D&D 5e Search action - make ability check and reveal hidden elements
 */
const executeDnDSearch: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e SearchHandler] Executing Search action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  const params = request.parameters as {
    checkType?: 'perception' | 'investigation';
    targetArea?: string;
    rollResult?: number; // If roll was made client-side
    dc?: number; // Target DC for the check
  };

  // Get actor from required actorId (always available)
  const actor = draft.documents[request.actorId];
  
  if (!actor) {
    throw new Error('Actor not found');
  }

  // Consume the action using the utility function
  consumeAction('action', actor, 'Search');

  // Store search information in actor state for potential results
  // In a full implementation, this would trigger ability check rolls and
  // reveal hidden elements based on the result vs DC
  if (!actor.state) actor.state = {};
  if (!actor.state.turnState) actor.state.turnState = {};

  const searchInfo = {
    checkType: params.checkType || 'perception',
    targetArea: params.targetArea,
    rollResult: params.rollResult,
    dc: params.dc,
    searchedAt: Date.now()
  };

  // Store search action details
  if (!actor.state.turnState.searchActions) {
    actor.state.turnState.searchActions = [];
  }
  actor.state.turnState.searchActions.push(searchInfo);

  console.log('[DnD5e SearchHandler] Search action executed successfully:', {
    actorName: actor.name,
    actorId: actor.id,
    checkType: searchInfo.checkType,
    targetArea: searchInfo.targetArea,
    note: 'Search results would be processed by GM or automated system'
  });
}

/**
 * Utility function to get search actions performed this turn
 * Can be used by GM tools or automated search result systems
 */
export function getSearchActions(actor: { state?: { turnState?: { searchActions?: Array<{checkType: string; targetArea?: string; rollResult?: number; dc?: number; searchedAt: number}> } } }): Array<{
  checkType: string;
  targetArea?: string;
  rollResult?: number;
  dc?: number;
  searchedAt: number;
}> {
  const turnState = actor?.state?.turnState;
  return turnState?.searchActions || [];
}

/**
 * Utility function to check if actor has searched a specific area
 */
export function hasSearchedArea(actor: { state?: { turnState?: { searchActions?: Array<{targetArea?: string}> } } }, area: string): boolean {
  const searchActions = getSearchActions(actor);
  return searchActions.some(search => search.targetArea === area);
}

/**
 * D&D 5e Search Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndSearchHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDSearch,
  execute: executeDnDSearch,
  approvalMessage: async (request) => {
    const params = request.parameters as { 
      checkType?: string; 
      targetArea?: string; 
    };
    const checkType = params.checkType === 'investigation' ? 'Investigation' : 'Perception';
    const area = params.targetArea ? ` the ${params.targetArea}` : ' the area';
    return `wants to Search${area} using ${checkType}`;
  }
};

// Export individual functions for compatibility
export { validateDnDSearch, executeDnDSearch };
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
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction, 
  findPlayerCharacter, 
  findPlayerCharacterInDraft
} from '../../utils/action-economy.mjs';

/**
 * Validate D&D 5e Search action
 */
export async function validateDnDSearch(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e SearchHandler] Validating Search action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as {
    checkType?: 'perception' | 'investigation'; // Type of ability check
    targetArea?: string; // Area or object being searched
  };

  // Find the character for this player
  const character = findPlayerCharacter(request.playerId, gameState);
  
  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for search action' } 
    };
  }

  console.log('[DnD5e SearchHandler] Found character for search:', {
    characterName: character.name,
    characterId: character.id,
    checkType: params.checkType || 'perception'
  });

  // Use action economy utility to validate the search action
  return await validateActionEconomy('action', character, gameState, 'Search');
}

/**
 * Execute D&D 5e Search action - make ability check and reveal hidden elements
 */
export function executeDnDSearch(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
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

  // Find the character in the draft state
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e SearchHandler] Character not found during search execution');
    return;
  }

  // Consume the action using the utility function
  consumeAction('action', character, 'Search');

  // Store search information in character state for potential results
  // In a full implementation, this would trigger ability check rolls and
  // reveal hidden elements based on the result vs DC
  if (!character.state) character.state = {};
  if (!character.state.turnState) character.state.turnState = {};

  const searchInfo = {
    checkType: params.checkType || 'perception',
    targetArea: params.targetArea,
    rollResult: params.rollResult,
    dc: params.dc,
    searchedAt: Date.now()
  };

  // Store search action details
  if (!character.state.turnState.searchActions) {
    character.state.turnState.searchActions = [];
  }
  character.state.turnState.searchActions.push(searchInfo);

  console.log('[DnD5e SearchHandler] Search action executed successfully:', {
    characterName: character.name,
    characterId: character.id,
    checkType: searchInfo.checkType,
    targetArea: searchInfo.targetArea,
    note: 'Search results would be processed by GM or automated system'
  });
}

/**
 * Utility function to get search actions performed this turn
 * Can be used by GM tools or automated search result systems
 */
export function getSearchActions(character: any): Array<{
  checkType: string;
  targetArea?: string;
  rollResult?: number;
  dc?: number;
  searchedAt: number;
}> {
  const turnState = character?.state?.turnState;
  return turnState?.searchActions || [];
}

/**
 * Utility function to check if character has searched a specific area
 */
export function hasSearchedArea(character: any, area: string): boolean {
  const searchActions = getSearchActions(character);
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
  approvalMessage: (request) => {
    const params = request.parameters as { 
      checkType?: string; 
      targetArea?: string; 
    };
    const checkType = params.checkType === 'investigation' ? 'Investigation' : 'Perception';
    const area = params.targetArea ? ` the ${params.targetArea}` : ' the area';
    return `wants to Search${area} using ${checkType}`;
  }
};
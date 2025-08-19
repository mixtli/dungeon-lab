/**
 * D&D 5e Move Token Action Handler
 * 
 * Enhances core token movement with D&D-specific validation:
 * - Movement speed limits based on character speed
 * - Condition checks (paralyzed, grappled, etc.)
 * - Movement tracking per turn
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Convert world pixel distance to feet using D&D grid scale
 */
function convertWorldPixelsToFeet(pixelDistance: number, gameState: ServerGameStateWithVirtuals): number {
  // Try to get actual grid scale from current map
  let pixelsPerGridCell = 50; // Default fallback
  
  if (gameState.currentEncounter?.currentMap?.uvtt?.resolution?.pixels_per_grid) {
    pixelsPerGridCell = gameState.currentEncounter.currentMap.uvtt.resolution.pixels_per_grid;
  }
  
  // D&D standard: 1 grid cell = 5 feet
  const feetPerGridCell = 5;
  const distanceInFeet = (pixelDistance / pixelsPerGridCell) * feetPerGridCell;
  
  console.log('[DnD5e] World pixels to feet conversion:', {
    pixelDistance,
    pixelsPerGridCell,
    feetPerGridCell,
    distanceInFeet
  });
  
  return distanceInFeet;
}

/**
 * Validate D&D movement constraints
 */
export function validateDnDMovement(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e] Validating movement with D&D rules:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found for movement' } };
  }

  // Get movement distance from request (in world pixels) and convert to feet
  const pixelDistance = (request.parameters as { distance?: number }).distance || 0;
  const distance = convertWorldPixelsToFeet(pixelDistance, gameState);
  
  // Check character's base speed (from pluginData) 
  const baseSpeed = (character.pluginData as { speed?: number }).speed || 30;
  
  // Check movement already used this turn (from turnState)
  const movementUsed = (character.state?.turnState?.movementUsed as number) || 0;
  
  console.log('[DnD5e] Movement check:', {
    characterName: character.name,
    baseSpeed,
    movementUsed,
    distance,
    availableMovement: baseSpeed - movementUsed
  });

  // Check if character has enough movement remaining
  const availableMovement = baseSpeed - movementUsed;
  if (distance > availableMovement) {
    return {
      valid: false,
      error: { 
        code: 'INSUFFICIENT_MOVEMENT',
        message: `Need ${distance} feet, have ${availableMovement} remaining (Speed: ${baseSpeed})`
      }
    };
  }
  
  // Check for conditions that prevent movement (from state)
  const conditions = (character.state?.conditions as string[]) || [];
  const movementBlockingConditions = ['grappled', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
  const blockedByCondition = conditions.find((condition: string) => 
    movementBlockingConditions.includes(condition.toLowerCase())
  );
  
  if (blockedByCondition) {
    return {
      valid: false,
      error: { 
        code: 'MOVEMENT_RESTRICTED', 
        message: `Character cannot move due to condition: ${blockedByCondition}`
      }
    };
  }
  
  console.log('[DnD5e] Movement validation passed');
  return { valid: true };
}

/**
 * Execute D&D movement - update movement used state
 */
export function executeDnDMovement(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e] Executing D&D movement state update');

  // Find the character for this player
  const character = Object.values(draft.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    console.warn('[DnD5e] Character not found during movement execution');
    return;
  }

  // Convert world pixel distance to feet for D&D tracking
  const pixelDistance = (request.parameters as { distance?: number }).distance || 0;
  const distance = convertWorldPixelsToFeet(pixelDistance, draft);
  
  // Initialize state if needed
  if (!character.state) character.state = {};
  if (!character.state.turnState) character.state.turnState = {};
  
  // Update movement used this turn - Immer will track this mutation
  const currentMovementUsed = (character.state.turnState.movementUsed as number) || 0;
  character.state.turnState.movementUsed = currentMovementUsed + distance;
  
  console.log('[DnD5e] Updated movement state:', {
    characterName: character.name,
    previousMovementUsed: currentMovementUsed,
    distance,
    newMovementUsed: character.state.turnState.movementUsed
  });
}

/**
 * D&D Move Token Action Handler
 * Registered as a plugin handler with priority 100 (after core)
 */
export const dndMoveTokenHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100, // After core movement handler
  validate: validateDnDMovement,
  execute: executeDnDMovement
};
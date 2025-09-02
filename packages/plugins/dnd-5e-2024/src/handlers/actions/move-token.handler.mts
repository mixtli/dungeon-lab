/**
 * D&D 5e Move Token Action Handler
 * 
 * Enhances core token movement with D&D-specific validation:
 * - Movement speed limits based on character speed
 * - Condition checks (paralyzed, grappled, etc.)
 * - Movement tracking per turn
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { DndCharacterData } from '../../types/dnd/character.mjs';
import type { DndCreatureData } from '../../types/dnd/creature.mjs';


/**
 * Calculate movement distance in feet from original position to target position
 * Both positions are now in grid coordinates
 */
function calculateMovementDistance(
  originalGridPos: { gridX: number; gridY: number },
  targetGridPos: { gridX: number; gridY: number }
): number {
  // Calculate distance in grid cells - much simpler now!
  const deltaGridX = targetGridPos.gridX - originalGridPos.gridX;
  const deltaGridY = targetGridPos.gridY - originalGridPos.gridY;
  const distanceInGridCells = Math.sqrt(deltaGridX * deltaGridX + deltaGridY * deltaGridY);
  
  // Convert to feet (D&D standard: 1 grid cell = 5 feet)
  const distanceInFeet = distanceInGridCells * 5;
  
  console.log('[DnD5e] Movement distance calculation:', {
    originalGrid: originalGridPos,
    targetGrid: targetGridPos,
    deltaGrid: { x: deltaGridX, y: deltaGridY },
    distanceInGridCells,
    distanceInFeet
  });
  
  return distanceInFeet;
}

/**
 * Extract walk speed from character or actor document
 */
function getWalkSpeed(document: { documentType: string, pluginData: unknown }): number {
  console.log('[DnD5e] Extracting walk speed from document:', {
    documentType: document.documentType,
    pluginData: document.pluginData
  });

  if (document.documentType === 'character') {
    const characterData = document.pluginData as DndCharacterData;
    const walkSpeed = characterData.attributes?.movement?.walk ?? 30;
    console.log('[DnD5e] Character walk speed:', walkSpeed);
    return walkSpeed;
  } 
  
  if (document.documentType === 'actor') {
    const creatureData = document.pluginData as DndCreatureData;
    const walkSpeed = creatureData.speed?.walk ?? 30;
    console.log('[DnD5e] Actor walk speed:', walkSpeed);
    return walkSpeed;
  }

  // Fallback for unknown document types
  console.warn('[DnD5e] Unknown document type, using default speed:', document.documentType);
  return 30;
}

/**
 * Validate D&D movement constraints
 */
const validateDnDMovement: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e] Validating movement with D&D rules:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Get tokenId from parameters and find the token
  const { tokenId } = request.parameters as { tokenId: string };
  const token = gameState.currentEncounter?.tokens?.[tokenId];
  
  if (!token) {
    return { valid: false, error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' } };
  }
  
  if (!token.documentId) {
    return { valid: false, error: { code: 'NO_DOCUMENT_ID', message: 'Token has no associated document' } };
  }
  
  // Look up the character/actor directly using the token's documentId
  const character = gameState.documents[token.documentId];
  
  if (!character) {
    return { valid: false, error: { code: 'CHARACTER_NOT_FOUND', message: 'Character document not found' } };
  }

  console.log('[DnD5e] Found character for token:', {
    tokenId,
    tokenName: token.name,
    characterId: character.id,
    characterName: character.name,
    documentType: character.documentType
  });

  // Check turn-based rules - is it this character's turn?
  const turnManager = gameState.turnManager;
  if (turnManager) {
    const currentParticipant = turnManager.participants[turnManager.currentTurn];
    console.log('[DnD5e] Turn validation:', {
      currentTurn: turnManager.currentTurn,
      currentParticipant: currentParticipant?.name,
      currentParticipantId: currentParticipant?.id,
      movingCharacterId: character.id
    });
    
    if (!currentParticipant) {
      return { 
        valid: false, 
        error: { 
          code: 'NO_CURRENT_TURN', 
          message: "No active turn in progress" 
        } 
      };
    }
    
    // Check if the character being moved is the current turn participant
    const isCharactersTurn = currentParticipant.actorId === character.id;
    
    if (!isCharactersTurn) {
      return { 
        valid: false, 
        error: { 
          code: 'NOT_CHARACTERS_TURN', 
          message: `It's not ${character.name}'s turn to move` 
        } 
      };
    }
    
  }

  // Store original position in grid coordinates for execution phase
  const originalGridPosition = {
    gridX: token.bounds.topLeft.x,
    gridY: token.bounds.topLeft.y
  };
  
  // Store original position in request parameters for execution phase
  (request.parameters as Record<string, unknown>).dndOriginalPosition = originalGridPosition;

  // Calculate movement distance using grid coordinates
  const { newPosition } = request.parameters as { newPosition: { gridX: number; gridY: number; elevation?: number } };
  const distance = calculateMovementDistance(originalGridPosition, newPosition);
  
  // Check character's base speed using proper data structure extraction
  const baseSpeed = getWalkSpeed({ documentType: character.documentType || 'character', pluginData: character.pluginData });
  
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
  console.log('[DnD5e] Character conditions debug:', {
    characterName: character.name,
    documentType: character.documentType,
    conditions: conditions,
    stateStructure: character.state,
    conditionsType: typeof character.state?.conditions
  });
  
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
const executeDnDMovement: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e] Executing D&D movement state update');

  // Get tokenId from parameters and find the token
  const { tokenId } = request.parameters as { tokenId: string };
  const token = draft.currentEncounter?.tokens?.[tokenId];
  
  if (!token) {
    console.warn('[DnD5e] Token not found during movement execution:', tokenId);
    return;
  }
  
  if (!token.documentId) {
    console.warn('[DnD5e] Token has no documentId during movement execution:', tokenId);
    return;
  }
  
  // Look up the character/actor directly using the token's documentId
  const character = draft.documents[token.documentId];
  
  if (!character) {
    console.warn('[DnD5e] Character not found during movement execution:', token.documentId);
    return;
  }

  console.log('[DnD5e] Executing movement for character:', {
    tokenId,
    tokenName: token.name,
    characterId: character.id,
    characterName: character.name
  });

  // Use stored original position from validation phase to calculate movement distance
  const { newPosition, dndOriginalPosition } = request.parameters as { 
    newPosition: { gridX: number; gridY: number; elevation?: number };
    dndOriginalPosition?: { gridX: number; gridY: number };
  };
  
  if (!dndOriginalPosition) {
    console.warn('[DnD5e] No original position stored - validation phase may have failed');
    return;
  }
  
  const distance = calculateMovementDistance(dndOriginalPosition, newPosition);
  
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

// Export individual functions for compatibility
export { validateDnDMovement, executeDnDMovement };
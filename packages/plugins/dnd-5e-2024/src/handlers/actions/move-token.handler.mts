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
import type { DndCharacterData, DndCharacterDocument } from '../../types/dnd/character.mjs';
import type { DndCreatureData, DndCreatureDocument } from '../../types/dnd/creature.mjs';

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
export function validateDnDMovement(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e] Validating movement with D&D rules:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Get tokenId from parameters and find the token
  const { tokenId } = request.parameters as { tokenId: string };
  const token = gameState.currentEncounter?.tokens?.find(t => t.id === tokenId);
  
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
    
    // Check if the requesting player owns the character
    const isPlayerOwner = character.createdBy === request.playerId || 
                         character.ownerId === request.playerId;
    
    console.log('[DnD5e] Ownership check:', {
      characterOwner: character.createdBy || character.ownerId,
      requestingPlayerId: request.playerId,
      isPlayerOwner
    });
    
    if (!isPlayerOwner) {
      return { 
        valid: false, 
        error: { 
          code: 'NOT_OWNER', 
          message: `You don't own ${character.name}` 
        } 
      };
    }
  }

  // Get movement distance from request (in world pixels) and convert to feet
  const pixelDistance = (request.parameters as { distance?: number }).distance || 0;
  const distance = convertWorldPixelsToFeet(pixelDistance, gameState);
  
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
export function executeDnDMovement(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e] Executing D&D movement state update');

  // Get tokenId from parameters and find the token
  const { tokenId } = request.parameters as { tokenId: string };
  const token = draft.currentEncounter?.tokens?.find(t => t.id === tokenId);
  
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
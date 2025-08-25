/**
 * D&D 5e Apply Damage Action Handler
 * 
 * Handles damage application with D&D-specific validation:
 * - Character existence and state validation
 * - Damage type handling (physical, magical, elemental)
 * - Resistance, immunity, and vulnerability calculations
 * - Death save triggers and unconscious conditions
 * - Current hit points validation and updates
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { DndCharacterData } from '../../types/dnd/character.mjs';

/**
 * Validate damage application requirements
 */
const validateDamageApplication: ActionValidationHandler = async (
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e] Validating damage application:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the target (damage can be applied to any character or actor, not just the requester's)
  const params = request.parameters as { 
    targetTokenId: string;
    damage: number;
    damageType?: string;
    source?: string;
    ignoreResistances?: boolean;
  };
  
  const { targetTokenId, damage } = params;
  
  if (!targetTokenId || typeof damage !== 'number') {
    return { 
      valid: false, 
      error: { code: 'INVALID_PARAMETERS', message: 'Missing target token ID or damage amount' } 
    };
  }

  if (damage < 0) {
    return { 
      valid: false, 
      error: { code: 'INVALID_DAMAGE', message: 'Damage amount cannot be negative' } 
    };
  }

  // Look up token to get the linked document
  const token = gameState.currentEncounter?.tokens?.[targetTokenId];
  if (!token) {
    return { 
      valid: false, 
      error: { code: 'TOKEN_NOT_FOUND', message: 'Target token not found' } 
    };
  }
  
  // Get linked document ID from token
  const documentId = token.documentId;
  if (!documentId) {
    return { 
      valid: false, 
      error: { code: 'NO_LINKED_DOCUMENT', message: 'Token has no linked document' } 
    };
  }
  
  // Find the target document (character or actor)
  const targetDocument = gameState.documents[documentId];
  if (!targetDocument) {
    return { 
      valid: false, 
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Target document not found' } 
    };
  }
  
  // Validate document type can take damage
  if (!['character', 'actor'].includes(targetDocument.documentType)) {
    return { 
      valid: false, 
      error: { code: 'INVALID_TARGET_TYPE', message: 'Target must be a character or actor' } 
    };
  }

  // Validate document has hit points data - support both character and actor structures
  let currentHp: number | undefined;
  let maxHp: number | undefined;

  // Check state first (runtime current HP)
  currentHp = targetDocument.state?.currentHitPoints as number;
  
  // If no state HP, check plugin data structures based on document type
  if (typeof currentHp !== 'number') {
    if (targetDocument.documentType === 'character') {
      // Character structure: pluginData.attributes.hitPoints.{current,maximum}
      const characterData = targetDocument.pluginData as DndCharacterData;
      const characterHp = characterData?.attributes?.hitPoints;
      if (characterHp && typeof characterHp.current === 'number') {
        currentHp = characterHp.current;
        maxHp = characterHp.maximum;
      }
    } else if (targetDocument.documentType === 'actor') {
      // Actor structure: pluginData.hitPoints.{current,average}
      const actorData = targetDocument.pluginData as { hitPoints?: { current?: number; average?: number } };
      const actorHp = actorData?.hitPoints;
      if (actorHp) {
        currentHp = actorHp.current ?? actorHp.average; // Use current if available, else average
        maxHp = actorHp.average; // Average is the max HP for actors
      }
    }
  } else {
    // State HP exists, get max HP from plugin data based on document type
    if (targetDocument.documentType === 'character') {
      const characterData = targetDocument.pluginData as DndCharacterData;
      const characterHp = characterData?.attributes?.hitPoints;
      if (characterHp?.maximum) {
        maxHp = characterHp.maximum;
      }
    } else if (targetDocument.documentType === 'actor') {
      const actorData = targetDocument.pluginData as { hitPoints?: { average?: number } };
      const actorHp = actorData?.hitPoints;
      if (actorHp?.average) {
        maxHp = actorHp.average;
      }
    }
  }

  console.log('[DnD5e] HP validation data:', {
    documentType: targetDocument.documentType,
    documentName: targetDocument.name,
    currentHp,
    maxHp,
    stateHP: targetDocument.state?.currentHitPoints,
    pluginData: targetDocument.pluginData
  });

  if (typeof currentHp !== 'number' || typeof maxHp !== 'number') {
    return { 
      valid: false, 
      error: { code: 'INVALID_HIT_POINTS', message: 'Target hit points not properly configured' } 
    };
  }

  // Target is already dead (negative max HP damage)
  if (currentHp <= -maxHp) {
    return { 
      valid: false, 
      error: { code: 'ALREADY_DEAD', message: 'Target is already dead' } 
    };
  }

  console.log('[DnD5e] Damage application validation passed');
  return { valid: true };
}

/**
 * Calculate actual damage after resistances, immunities, and vulnerabilities
 */
function calculateActualDamage(
  baseDamage: number, 
  damageType: string, 
  character: { pluginData?: { resistances?: string[]; immunities?: string[]; vulnerabilities?: string[] } },
  ignoreResistances = false
): { actualDamage: number; wasResisted: boolean; wasImmune: boolean; wasVulnerable: boolean } {
  if (ignoreResistances) {
    return { actualDamage: baseDamage, wasResisted: false, wasImmune: false, wasVulnerable: false };
  }

  const pluginData = character.pluginData as { 
    resistances?: string[]; 
    immunities?: string[]; 
    vulnerabilities?: string[];
  };
  const resistances = pluginData?.resistances || [];
  const immunities = pluginData?.immunities || [];
  const vulnerabilities = pluginData?.vulnerabilities || [];

  // Check immunity first (takes precedence)
  if (immunities.includes(damageType)) {
    return { actualDamage: 0, wasResisted: false, wasImmune: true, wasVulnerable: false };
  }

  // Check resistance and vulnerability
  const isResistant = resistances.includes(damageType);
  const isVulnerable = vulnerabilities.includes(damageType);

  let actualDamage = baseDamage;
  
  if (isResistant && isVulnerable) {
    // Resistance and vulnerability cancel each other out in D&D 5e
    actualDamage = baseDamage;
  } else if (isResistant) {
    actualDamage = Math.floor(baseDamage / 2);
  } else if (isVulnerable) {
    actualDamage = baseDamage * 2;
  }

  return { 
    actualDamage, 
    wasResisted: isResistant && !isVulnerable, 
    wasImmune: false, 
    wasVulnerable: isVulnerable && !isResistant 
  };
}

/**
 * Execute damage application - update hit points and handle conditions
 */
const executeDamageApplication: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e] Executing damage application');

  const params = request.parameters as { 
    targetTokenId: string;
    damage: number;
    damageType?: string;
    source?: string;
    ignoreResistances?: boolean;
  };
  
  const { targetTokenId, damage, damageType = 'bludgeoning', source, ignoreResistances = false } = params;

  // Look up token to get the linked document
  const token = draft.currentEncounter?.tokens?.[targetTokenId];
  if (!token) {
    console.warn('[DnD5e] Target token not found during damage application:', targetTokenId);
    return;
  }
  
  // Get linked document ID from token
  const documentId = token.documentId;
  if (!documentId) {
    console.warn('[DnD5e] Token has no linked document during damage application:', targetTokenId);
    return;
  }
  
  // Find the target document (character or actor)
  const targetDocument = draft.documents[documentId];
  if (!targetDocument) {
    console.warn('[DnD5e] Target document not found during damage application:', documentId);
    return;
  }

  // Initialize state if needed
  if (!targetDocument.state) targetDocument.state = {};

  // Get current hit points - support both character and actor structures
  let currentHp: number = 0; // Initialize with default
  let maxHp: number = 0; // Initialize with default

  // Check state first (runtime current HP)
  if (typeof targetDocument.state.currentHitPoints === 'number') {
    currentHp = targetDocument.state.currentHitPoints;
    
    // Get max HP from plugin data based on document type
    if (targetDocument.documentType === 'character') {
      const characterData = targetDocument.pluginData as DndCharacterData;
      const characterHp = characterData?.attributes?.hitPoints;
      if (characterHp?.maximum) {
        maxHp = characterHp.maximum;
      } else {
        maxHp = 8; // Default for characters
      }
    } else if (targetDocument.documentType === 'actor') {
      const actorData = targetDocument.pluginData as { hitPoints?: { average?: number } };
      const actorHp = actorData?.hitPoints;
      if (actorHp?.average) {
        maxHp = actorHp.average;
      } else {
        maxHp = 0; // Default for actors without HP data
      }
    }
  } else {
    // No state HP, get from plugin data based on document type
    if (targetDocument.documentType === 'character') {
      const characterData = targetDocument.pluginData as DndCharacterData;
      const characterHp = characterData?.attributes?.hitPoints;
      if (characterHp && typeof characterHp.current === 'number' && typeof characterHp.maximum === 'number') {
        currentHp = characterHp.current;
        maxHp = characterHp.maximum;
      } else {
        currentHp = 8; // Default character HP
        maxHp = 8;
      }
    } else if (targetDocument.documentType === 'actor') {
      const actorData = targetDocument.pluginData as { hitPoints?: { current?: number; average?: number } };
      const actorHp = actorData?.hitPoints;
      if (actorHp && typeof actorHp.average === 'number') {
        currentHp = actorHp.current ?? actorHp.average;
        maxHp = actorHp.average;
      } else {
        currentHp = 0;
        maxHp = 0;
      }
    } else {
      // Unknown document type
      currentHp = 0;
      maxHp = 0;
    }
  }

  // Calculate actual damage after resistances/immunities/vulnerabilities
  const damageResult = calculateActualDamage(damage, damageType, targetDocument, ignoreResistances);
  const { actualDamage, wasResisted, wasImmune, wasVulnerable } = damageResult;

  // Apply damage to current hit points
  const newHp = Math.max(currentHp - actualDamage, -maxHp); // Can't go below negative max HP
  targetDocument.state.currentHitPoints = newHp;

  // Check for instant death FIRST (damage >= max HP while at 0 HP)
  if (currentHp === 0 && actualDamage >= maxHp) {
    if (!targetDocument.state.conditions) targetDocument.state.conditions = [];
    const conditions = targetDocument.state.conditions as string[];
    
    if (!conditions.includes('dead')) {
      conditions.push('dead');
      
      // Remove unconscious and dying when dead (remove in reverse order to avoid index shifts)
      const unconsciousIndex = conditions.indexOf('unconscious');
      const dyingIndex = conditions.indexOf('dying');
      
      // Remove higher index first to avoid shifting
      if (unconsciousIndex >= 0 && dyingIndex >= 0) {
        if (unconsciousIndex > dyingIndex) {
          conditions.splice(unconsciousIndex, 1);
          conditions.splice(dyingIndex, 1);
        } else {
          conditions.splice(dyingIndex, 1);
          conditions.splice(unconsciousIndex, 1);
        }
      } else if (unconsciousIndex >= 0) {
        conditions.splice(unconsciousIndex, 1);
      } else if (dyingIndex >= 0) {
        conditions.splice(dyingIndex, 1);
      }
    }
  } else {
    // Handle normal unconscious/death conditions (only if not instant death)
    const conditions = (targetDocument.state.conditions || []) as string[];
    const wasUnconscious = conditions.includes('unconscious');
    const wasDying = conditions.includes('dying');

    if (newHp <= 0 && currentHp > 0) {
      // Character just became unconscious/dying
      if (!targetDocument.state.conditions) targetDocument.state.conditions = [];
      const activeConditions = targetDocument.state.conditions as string[];
      
      if (!activeConditions.includes('unconscious')) {
        activeConditions.push('unconscious');
      }
      
      if (newHp < 0 && !activeConditions.includes('dying')) {
        activeConditions.push('dying');
        // Initialize death saves if not present
        if (!targetDocument.state.deathSaves) {
          targetDocument.state.deathSaves = { successes: 0, failures: 0 };
        }
      }
    } else if (newHp > 0 && (wasUnconscious || wasDying)) {
      // Character regained consciousness (this is healing, but we handle it here for completeness)
      if (targetDocument.state.conditions) {
        const activeConditions = targetDocument.state.conditions as string[];
        const unconsciousIndex = activeConditions.indexOf('unconscious');
        const dyingIndex = activeConditions.indexOf('dying');
        
        if (unconsciousIndex >= 0) activeConditions.splice(unconsciousIndex, 1);
        if (dyingIndex >= 0) activeConditions.splice(dyingIndex, 1);
        
        // Clear death saves when no longer dying
        if (targetDocument.state.deathSaves) {
          delete targetDocument.state.deathSaves;
        }
      }
    }
  }

  console.log('[DnD5e] Damage application completed:', {
    targetName: targetDocument.name,
    targetType: targetDocument.documentType,
    originalDamage: damage,
    actualDamage,
    damageType,
    wasResisted,
    wasImmune,
    wasVulnerable,
    oldHp: currentHp,
    newHp,
    maxHp,
    source,
    conditions: targetDocument.state.conditions
  });
}

/**
 * D&D Apply Damage Action Handler
 * Pure plugin action - not enhancing a core action
 */
export const dndApplyDamageHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateDamageApplication,
  execute: executeDamageApplication,
  approvalMessage: async (request) => {
    const params = request.parameters as { 
      targetTokenId: string;
      damage: number;
      damageType?: string;
      source?: string;
    };
    const { damage, damageType = 'bludgeoning', source } = params;
    const sourceText = source ? ` from ${source}` : '';
    return `wants to apply ${damage} ${damageType} damage${sourceText}`;
  }
};

// Export individual functions for compatibility
export { validateDamageApplication, executeDamageApplication };
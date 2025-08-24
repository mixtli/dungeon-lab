/**
 * D&D 5e 2024 Spell Lookup Service
 * 
 * Provides spell data integration for spell casting handlers.
 * Uses pluginContext.getDocument() for spell lookup and supports
 * both characters and actors as casters/targets.
 */

import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { ICharacter, IActor, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { DndSpellDocument, DndSpellData } from '../types/dnd/spell.mjs';
import type { DndCharacterData } from '../types/dnd/character.mjs';
import type { MonsterSpellcasting } from '../types/dnd/common.mjs';
import { unref } from 'vue';

/**
 * Union type for documents that can cast spells
 */
export type SpellCaster = ICharacter | IActor;

/**
 * Union type for documents that can be spell targets
 */
export type SpellTarget = ICharacter | IActor;

/**
 * Spell casting context information
 */
export interface SpellCastingContext {
  caster: SpellCaster;
  casterTokenId?: string;
  spell: DndSpellDocument;
  spellLevel: number; // Level at which spell is being cast
  targets?: SpellTarget[];
  targetTokenIds?: string[];
}

/**
 * Core spell lookup function using pluginContext.getDocument()
 * Spells are stored as compendium entries, not in gameState
 */
export async function lookupSpell(
  spellId: string, 
  pluginContext: PluginContext
): Promise<DndSpellDocument | null> {
  try {
    console.log('[SpellLookup] Looking up spell:', spellId);
    
    // Use pluginContext to get spell document from compendium
    const document = await pluginContext.getDocument(spellId);
    
    if (!document) {
      console.warn('[SpellLookup] Spell not found:', spellId);
      return null;
    }
    
    // Validate that this is a spell document
    if (document.pluginDocumentType !== 'spell') {
      console.warn('[SpellLookup] Document is not a spell:', {
        spellId,
        actualType: document.pluginDocumentType
      });
      return null;
    }
    
    const spell = document as DndSpellDocument;
    
    console.log('[SpellLookup] Found spell:', {
      id: spell.id,
      name: spell.pluginData.name,
      level: spell.pluginData.level,
      school: spell.pluginData.school
    });
    
    return spell;
    
  } catch (error) {
    console.error('[SpellLookup] Error looking up spell:', error);
    return null;
  }
}

/**
 * Check if a spell is a cantrip (level 0)
 */
export function isCantrip(spell: DndSpellDocument | DndSpellData): boolean {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  return spellData.level === 0;
}

/**
 * Check if spell requires concentration
 */
export function requiresConcentration(spell: DndSpellDocument | DndSpellData): boolean {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  return spellData.concentration || false;
}

/**
 * Check if spell can be cast as a ritual
 */
export function canCastAsRitual(spell: DndSpellDocument | DndSpellData): boolean {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  return spellData.ritual || false;
}

/**
 * Check if spell requires an attack roll
 */
export function requiresAttackRoll(spell: DndSpellDocument | DndSpellData): boolean {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  return !!spellData.attackRoll;
}

/**
 * Check if spell requires a saving throw
 */
export function requiresSavingThrow(spell: DndSpellDocument | DndSpellData): boolean {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  return !!spellData.savingThrow;
}

/**
 * Get spell damage information
 */
export function getSpellDamage(spell: DndSpellDocument | DndSpellData): { dice: string; type: string } | null {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  if (!spellData.damage) return null;
  
  return {
    dice: spellData.damage.dice,
    type: spellData.damage.type
  };
}

/**
 * Get spell saving throw information with DC calculation
 */
export function getSpellSavingThrow(spell: DndSpellDocument | DndSpellData, caster?: SpellCaster, className?: string): { ability: string; effectOnSave: string; dc?: number } | null {
  const spellData = 'pluginData' in spell ? spell.pluginData : spell;
  if (!spellData.savingThrow) return null;
  
  const saveInfo = {
    ability: spellData.savingThrow.ability,
    effectOnSave: spellData.savingThrow.effectOnSave
  };
  
  // Include DC calculation if caster is provided
  if (caster) {
    return {
      ...saveInfo,
      dc: calculateSpellSaveDC(caster, className)
    };
  }
  
  return saveInfo;
}

/**
 * Get caster document for a token ID
 * Supports both characters and actors as casters
 */
export function getCasterForToken(tokenId: string, gameState: ServerGameStateWithVirtuals): SpellCaster | null {
  try {
    // Get plain game state for calculations to avoid Vue proxy issues
    const plainGameState = unref(gameState);
    
    // Find token in current encounter
    const token = plainGameState.currentEncounter?.tokens?.find(t => t.id === tokenId);
    if (!token || !token.documentId) {
      console.warn('[SpellLookup] Token not found or has no linked document:', tokenId);
      return null;
    }
    
    // Get linked document
    const document = plainGameState.documents?.[token.documentId];
    if (!document) {
      console.warn('[SpellLookup] Document not found for token:', {
        tokenId,
        documentId: token.documentId
      });
      return null;
    }
    
    // Check if document can cast spells (character or actor)
    if (!['character', 'actor'].includes(document.documentType)) {
      console.warn('[SpellLookup] Document cannot cast spells:', {
        tokenId,
        documentId: token.documentId,
        documentType: document.documentType
      });
      return null;
    }
    
    console.log('[SpellLookup] Found caster for token:', {
      tokenId,
      documentId: token.documentId,
      documentType: document.documentType,
      name: document.name
    });
    
    return document as SpellCaster;
    
  } catch (error) {
    console.error('[SpellLookup] Error getting caster for token:', error);
    return null;
  }
}

/**
 * Get target document for a token ID
 * Supports both characters and actors as targets
 */
export function getTargetForToken(tokenId: string, gameState: ServerGameStateWithVirtuals): SpellTarget | null {
  try {
    // Get plain game state for calculations to avoid Vue proxy issues
    const plainGameState = unref(gameState);
    
    // Find token in current encounter
    const token = plainGameState.currentEncounter?.tokens?.find(t => t.id === tokenId);
    if (!token || !token.documentId) {
      console.warn('[SpellLookup] Target token not found or has no linked document:', tokenId);
      return null;
    }
    
    // Get linked document
    const document = plainGameState.documents?.[token.documentId];
    if (!document) {
      console.warn('[SpellLookup] Target document not found for token:', {
        tokenId,
        documentId: token.documentId
      });
      return null;
    }
    
    // Check if document can be targeted (character or actor)
    if (!['character', 'actor'].includes(document.documentType)) {
      console.warn('[SpellLookup] Document cannot be targeted:', {
        tokenId,
        documentId: token.documentId,
        documentType: document.documentType
      });
      return null;
    }
    
    console.log('[SpellLookup] Found target for token:', {
      tokenId,
      documentId: token.documentId,
      documentType: document.documentType,
      name: document.name
    });
    
    return document as SpellTarget;
    
  } catch (error) {
    console.error('[SpellLookup] Error getting target for token:', error);
    return null;
  }
}

/**
 * Get spellcasting ability for a caster
 * Characters have class-based spellcasting, actors have simpler spellcasting
 */
export function getSpellcastingAbility(caster: SpellCaster, className?: string): string | null {
  try {
    if (caster.documentType === 'character') {
      const characterData = caster.pluginData as DndCharacterData;
      const spellcasting = characterData.spellcasting;
      
      if (!spellcasting) {
        console.warn('[SpellLookup] Character has no spellcasting data:', caster.name);
        return null;
      }
      
      // If specific class is provided, use that class's spellcasting ability
      if (className && spellcasting.classes[className]) {
        return spellcasting.classes[className].ability;
      }
      
      // Otherwise, use first available spellcasting class
      const firstClass = Object.keys(spellcasting.classes)[0];
      if (firstClass) {
        return spellcasting.classes[firstClass].ability;
      }
      
      console.warn('[SpellLookup] Character has no spellcasting classes:', caster.name);
      return null;
      
    } else if (caster.documentType === 'actor') {
      // Actors have simplified spellcasting in their pluginData
      const actorData = caster.pluginData as { spellcasting?: MonsterSpellcasting };
      if (actorData.spellcasting) {
        return actorData.spellcasting.ability;
      }
      
      console.warn('[SpellLookup] Actor has no spellcasting data:', caster.name);
      return null;
    }
    
    return null;
    
  } catch (error) {
    console.error('[SpellLookup] Error getting spellcasting ability:', error);
    return null;
  }
}

/**
 * Calculate spell attack bonus for a caster
 */
export function calculateSpellAttackBonus(caster: SpellCaster, className?: string): number {
  try {
    if (caster.documentType === 'character') {
      const characterData = caster.pluginData as DndCharacterData;
      const spellcasting = characterData.spellcasting;
      
      if (!spellcasting) return 0;
      
      // If specific class is provided, use that class's attack bonus
      if (className && spellcasting.classes[className]) {
        return spellcasting.classes[className].spellAttackBonus;
      }
      
      // Otherwise, use first available spellcasting class
      const firstClass = Object.keys(spellcasting.classes)[0];
      if (firstClass) {
        return spellcasting.classes[firstClass].spellAttackBonus;
      }
      
      return 0;
      
    } else if (caster.documentType === 'actor') {
      const actorData = caster.pluginData as { spellcasting?: MonsterSpellcasting };
      return actorData.spellcasting?.spellAttackBonus || 0;
    }
    
    return 0;
    
  } catch (error) {
    console.error('[SpellLookup] Error calculating spell attack bonus:', error);
    return 0;
  }
}

/**
 * Calculate spell save DC for a caster
 */
export function calculateSpellSaveDC(caster: SpellCaster, className?: string): number {
  try {
    if (caster.documentType === 'character') {
      const characterData = caster.pluginData as DndCharacterData;
      const spellcasting = characterData.spellcasting;
      
      if (!spellcasting) return 8; // Default DC
      
      // If specific class is provided, use that class's save DC
      if (className && spellcasting.classes[className]) {
        return spellcasting.classes[className].spellSaveDC;
      }
      
      // Otherwise, use first available spellcasting class
      const firstClass = Object.keys(spellcasting.classes)[0];
      if (firstClass) {
        return spellcasting.classes[firstClass].spellSaveDC;
      }
      
      return 8; // Default DC
      
    } else if (caster.documentType === 'actor') {
      const actorData = caster.pluginData as { spellcasting?: MonsterSpellcasting };
      return actorData.spellcasting?.spellSaveDC || 8;
    }
    
    return 8; // Default DC
    
  } catch (error) {
    console.error('[SpellLookup] Error calculating spell save DC:', error);
    return 8;
  }
}

/**
 * Calculate target's saving throw bonus for a specific ability
 */
export function calculateTargetSaveBonus(target: SpellTarget, ability: string): number {
  try {
    if (target.documentType === 'character') {
      const characterData = target.pluginData as DndCharacterData;
      const savingThrows = characterData.savingThrows;
      
      if (!savingThrows) {
        console.warn('[SpellLookup] Character has no saving throw data:', target.name);
        return 0;
      }
      
      // Get saving throw modifier for the specified ability
      const saveBonus = savingThrows[ability as keyof typeof savingThrows];
      if (typeof saveBonus === 'number') {
        return saveBonus;
      }
      
      console.warn('[SpellLookup] Invalid saving throw ability for character:', {
        targetName: target.name,
        ability,
        availableAbilities: Object.keys(savingThrows)
      });
      return 0;
      
    } else if (target.documentType === 'actor') {
      const actorData = target.pluginData as { 
        savingThrows?: Record<string, number>;
        abilityScores?: Record<string, { modifier: number }>;
      };
      
      // First check if actor has explicit saving throw bonuses
      if (actorData.savingThrows && actorData.savingThrows[ability] !== undefined) {
        return actorData.savingThrows[ability];
      }
      
      // Fall back to ability modifier if no specific save bonus
      if (actorData.abilityScores && actorData.abilityScores[ability]) {
        return actorData.abilityScores[ability].modifier;
      }
      
      console.warn('[SpellLookup] Actor has no saving throw data for ability:', {
        targetName: target.name,
        ability
      });
      return 0;
    }
    
    return 0;
    
  } catch (error) {
    console.error('[SpellLookup] Error calculating target save bonus:', error);
    return 0;
  }
}

/**
 * Check if caster has spell slots available for a given level
 */
export function hasSpellSlotsAvailable(caster: SpellCaster, spellLevel: number): boolean {
  try {
    // Cantrips don't require spell slots
    if (spellLevel === 0) return true;
    
    if (caster.documentType === 'character') {
      const characterData = caster.pluginData as DndCharacterData;
      const spellcasting = characterData.spellcasting;
      
      if (!spellcasting) return false;
      
      // Check if character has slots of the required level
      const slotKey = spellLevel.toString();
      const slots = spellcasting.spellSlots[slotKey];
      
      if (!slots) return false;
      
      return slots.used < slots.total;
      
    } else if (caster.documentType === 'actor') {
      // Actors typically have at-will or daily spell usage rather than spell slots
      // For now, assume they can always cast (more complex logic can be added later)
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('[SpellLookup] Error checking spell slots:', error);
    return false;
  }
}

/**
 * Consume a spell slot of the given level
 * Returns true if slot was consumed, false if no slots available
 */
export function consumeSpellSlot(caster: SpellCaster, spellLevel: number): boolean {
  try {
    // Cantrips don't require spell slots
    if (spellLevel === 0) return true;
    
    if (caster.documentType === 'character') {
      const characterData = caster.pluginData as DndCharacterData;
      const spellcasting = characterData.spellcasting;
      
      if (!spellcasting) return false;
      
      // Check if character has slots of the required level
      const slotKey = spellLevel.toString();
      const slots = spellcasting.spellSlots[slotKey];
      
      if (!slots || slots.used >= slots.total) return false;
      
      // Consume the slot (this mutates the draft in Immer context)
      slots.used += 1;
      
      console.log('[SpellLookup] Consumed spell slot:', {
        casterName: caster.name,
        level: spellLevel,
        used: slots.used,
        total: slots.total
      });
      
      return true;
      
    } else if (caster.documentType === 'actor') {
      // Actors don't use traditional spell slots
      // More complex daily usage tracking could be implemented here
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('[SpellLookup] Error consuming spell slot:', error);
    return false;
  }
}
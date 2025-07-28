/**
 * Reference transformer for 5etools data
 * Transforms parsed references into ReferenceObject format using shared types
 */
import { ReferenceObject, DocumentReference } from '@dungeon-lab/shared/types/index.mjs';
import { documentTypeSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { ParsedReference, TextReferenceMatch, scanTextForReferences } from './reference-parser.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import type { EtoolsMonsterSpellcasting } from '../../5etools-types/monsters.mjs';
import type { SpellcastingType } from '../../types/dnd/index.mjs';
import type { z } from 'zod';

/**
 * Document type mapping for 5etools reference types
 */
type DocumentType = z.infer<typeof documentTypeSchema>;

const REFERENCE_TYPE_MAP: Record<string, DocumentType> = {
  'spell': 'vtt-document',
  'item': 'item',
  'condition': 'vtt-document',
  'variantrule': 'vtt-document',
  'class': 'vtt-document',
  'race': 'vtt-document',
  'background': 'vtt-document',
  'feat': 'vtt-document',
  'optionalfeature': 'vtt-document',
  'reward': 'vtt-document',
  'disease': 'vtt-document',
  'status': 'vtt-document',
  // Additional document types found in bestiary data
  'action': 'vtt-document',
  'creature': 'vtt-document', 
  'skill': 'vtt-document',
  'sense': 'vtt-document',
  'hazard': 'vtt-document',
  'object': 'vtt-document',
  'language': 'vtt-document',
  'cult': 'vtt-document',
  'deck': 'vtt-document'
} as const;

/**
 * Reference types that should be parsed into structured data rather than creating references
 * Note: All types should be lowercase since the parser converts them to lowercase
 */
const FORMATTING_REFERENCE_TYPES = new Set([
  'dc', 'damage', 'hit', 'recharge', 'actsave', 'actsavefail', 'actsavesuccess', 
  'actsavesuccessorfail', 'h', 'atk', 'atkr', 'dice', 'chance', 'hityourspellattack'
]);

/**
 * Reference types that should be converted to plain text (meta/system references)
 * Note: All types should be lowercase since the parser converts them to lowercase
 */
const TEXT_REFERENCE_TYPES = new Set([
  'quickref', 'table', 'book', 'adventure', 'filter', 'note', 'footnote', 
  'link', 'i', 'b', 'style'
]);

/**
 * Transforms a parsed reference into a ReferenceObject
 */
export function transformToReferenceObject(parsedRef: ParsedReference): ReferenceObject {
  const documentType = REFERENCE_TYPE_MAP[parsedRef.type] || 'vtt-document';
  
  const documentReference: DocumentReference = {
    slug: parsedRef.slug,
    type: documentType,
    pluginType: documentType === 'vtt-document' ? parsedRef.type : 'dnd-5e-2024',
    source: parsedRef.source,
    metadata: {
      originalType: parsedRef.type,
      originalName: parsedRef.name,
      ...parsedRef.metadata
    }
  };

  return {
    _ref: documentReference
  };
}

/**
 * Transforms an array of parsed references into ReferenceObjects
 */
export function transformReferences(parsedRefs: ParsedReference[]): ReferenceObject[] {
  return parsedRefs.map(transformToReferenceObject);
}

/**
 * Replaces text references with reference objects while preserving readability
 * Returns the modified text and an array of reference objects found
 */
export interface TextTransformResult {
  text: string;
  references: ReferenceObject[];
}

export function transformTextReferences(
  originalText: string, 
  matches: TextReferenceMatch[]
): TextTransformResult {
  let modifiedText = originalText;
  const references: ReferenceObject[] = [];
  
  // Sort matches by start index in reverse order to avoid index shifting issues
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const match of sortedMatches) {
    const refObject = transformToReferenceObject(match.reference);
    references.push(refObject);
    
    // Replace the embedded reference with just the name for readability
    // e.g., "{@spell Detect Magic|XPHB}" becomes "Detect Magic"
    modifiedText = modifiedText.slice(0, match.startIndex) + 
                   match.reference.name + 
                   modifiedText.slice(match.endIndex);
  }
  
  // Reverse the references array to maintain original order
  references.reverse();
  
  return {
    text: modifiedText,
    references
  };
}

/**
 * Transforms gear array into reference objects
 */
export function transformGearArray(gear: string[]): ReferenceObject[] {
  return gear.filter(item => typeof item === 'string').map(item => {
    const parts = item.split('|');
    const name = parts[0]?.trim() || '';
    const source = parts[1]?.trim().toLowerCase();
    
    const parsedRef: ParsedReference = {
      name,
      slug: name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, ''),
      type: 'item',
      source
    };
    
    return transformToReferenceObject(parsedRef);
  });
}

/**
 * Transforms 5etools spellcasting data to match the user's spellcastingSchema
 */
export function transformSpellcastingToSchema(spellcasting: EtoolsMonsterSpellcasting[]): SpellcastingType | undefined {
  if (!spellcasting || spellcasting.length === 0) {
    return undefined;
  }

  const sc = spellcasting[0]; // Take first spellcasting entry
  
  // Convert ability code to full name
  const abilityMap: Record<string, string> = {
    'str': 'strength',
    'dex': 'dexterity', 
    'con': 'constitution',
    'int': 'intelligence',
    'wis': 'wisdom',
    'cha': 'charisma'
  };
  
  const mappedAbility = sc.ability ? (abilityMap[sc.ability] || 'intelligence') : 'intelligence';
  const ability = (['intelligence', 'wisdom', 'charisma'].includes(mappedAbility) 
    ? mappedAbility 
    : 'intelligence') as 'intelligence' | 'wisdom' | 'charisma';
  
  // Parse spell save DC and attack bonus from header entries
  let spellSaveDC = 10;
  let spellAttackBonus = 0;
  
  if (sc.headerEntries) {
    for (const entry of sc.headerEntries) {
      if (typeof entry === 'string') {
        // Look for spell save DC pattern: {@dc 13}
        const dcMatch = entry.match(/{@dc (\d+)}/);
        if (dcMatch) {
          spellSaveDC = parseInt(dcMatch[1], 10);
        }
        
        // Look for spell attack bonus: {@hit 9}
        const hitMatch = entry.match(/{@hit ([+-]?\d+)}/);
        if (hitMatch) {
          spellAttackBonus = parseInt(hitMatch[1], 10);
        }
      }
    }
  }
  
  // Collect all spells from various sources
  const allSpells: Array<{id: ReferenceObject, prepared?: boolean}> = [];
  
  // Add will/at-will spells
  if (sc.will) {
    for (const spell of sc.will) {
      const spellRef = transformSpellEntry(spell);
      if (spellRef && typeof spellRef === 'object' && '_ref' in spellRef) {
        allSpells.push({ id: spellRef as ReferenceObject, prepared: true });
      }
    }
  }
  
  // Add daily spells
  if (sc.daily) {
    for (const [, spells] of Object.entries(sc.daily)) {
      if (Array.isArray(spells)) {
        for (const spell of spells) {
          const spellRef = transformSpellEntry(spell);
          if (spellRef && typeof spellRef === 'object' && '_ref' in spellRef) {
            allSpells.push({ id: spellRef as ReferenceObject, prepared: false });
          }
        }
      }
    }
  }
  
  // Generate spell slots based on daily structure
  const spellSlots: Array<{level: number, total: number, used: number}> = [];
  if (sc.daily) {
    for (const [key, spells] of Object.entries(sc.daily)) {
      if (Array.isArray(spells)) {
        // Parse slot info from key (e.g., "1e" = 1 per day each, "3" = 3 uses total)
        let level = 1;
        let total = 1;
        
        if (key.includes('e')) {
          // "1e", "2e" etc. = each spell can be cast once
          level = parseInt(key.replace('e', ''), 10) || 1;
          total = spells.length; // One slot per spell
        } else {
          // "1", "2", "3" etc. = total uses across all spells
          level = 1;
          total = parseInt(key, 10) || 1;
        }
        
        spellSlots.push({ level, total, used: 0 });
      }
    }
  }
  
  return {
    ability,
    spellSaveDC,
    spellAttackBonus, 
    spellSlots,
    spells: allSpells
  };
}

/**
 * Helper function to transform individual spell entries
 */
function transformSpellEntry(spell: string | { name: string; source?: string }): ReferenceObject | string {
  if (typeof spell === 'string') {
    // Try parsing as embedded reference first
    const embeddedMatch = spell.match(/^{@(\w+)\s+([^|}]+)(?:\|([^}]+))?}/);
    if (embeddedMatch) {
      const [, type, name, source] = embeddedMatch;
      const parsedRef: ParsedReference = {
        name: name.trim(),
        slug: name.trim().toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, ''),
        type: type.toLowerCase(),
        source: source?.trim().toLowerCase()
      };
      return transformToReferenceObject(parsedRef);
    }
    
    // Handle simple pipe format
    const parts = spell.split('|');
    if (parts.length >= 2) {
      const name = parts[0]?.trim() || '';
      const source = parts[1]?.trim().toLowerCase();
      
      const parsedRef: ParsedReference = {
        name,
        slug: name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, ''),
        type: 'spell',
        source
      };
      return transformToReferenceObject(parsedRef);
    }
  }
  
  // Return as-is if not a transformable reference (ensure we only return string for objects)
  return typeof spell === 'string' ? spell : (spell.name || 'Unknown Spell');
}

/**
 * Transforms condition immunity arrays into reference objects
 */
export function transformConditionImmunities(conditions: string[]): ReferenceObject[] {
  return conditions.filter(condition => typeof condition === 'string').map(condition => {
    const parsedRef: ParsedReference = {
      name: condition,
      slug: condition.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, ''),
      type: 'condition',
      source: 'xphb' // Default source for base conditions
    };
    
    return transformToReferenceObject(parsedRef);
  });
}

/**
 * Transforms monster action/trait entries, scanning for and replacing embedded references
 */
export function transformMonsterEntries(entries: EtoolsEntry[]): {
  entries: EtoolsEntry[];
  references: ReferenceObject[];
} {
  const allReferences: ReferenceObject[] = [];
  
  const transformedEntries = entries.map(entry => {
    if (typeof entry === 'string') {
      const matches = scanTextForReferences(entry);
      if (matches.length > 0) {
        const result = transformTextReferences(entry, matches);
        allReferences.push(...result.references);
        return result.text;
      }
      return entry;
    } else if (typeof entry === 'object' && entry) {
      // Handle nested structures
      const transformed = { ...entry };
      
      if ('entries' in entry && entry.entries) {
        const nestedResult = transformMonsterEntries(entry.entries);
        // Safe to cast since we confirmed 'entries' exists
        (transformed as typeof entry & { entries: EtoolsEntry[] }).entries = nestedResult.entries;
        allReferences.push(...nestedResult.references);
      }
      
      if ('items' in entry && entry.items) {
        const nestedResult = transformMonsterEntries(entry.items);
        // Safe to cast since we confirmed 'items' exists
        (transformed as typeof entry & { items: EtoolsEntry[] }).items = nestedResult.entries;
        allReferences.push(...nestedResult.references);
      }
      
      return transformed;
    }
    
    return entry;
  });
  
  return {
    entries: transformedEntries,
    references: allReferences
  };
}

/**
 * Parsed action data extracted from 5etools text
 */
export interface ParsedActionData {
  /** Clean description text with formatting tags replaced */
  description: string;
  /** References to legitimate documents only */
  references: ReferenceObject[];
  /** Extracted saving throw data */
  savingThrow?: {
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    dc: number;
  };
  /** Extracted damage expression */
  damage?: string;
  /** Extracted damage type */
  damageType?: string;
  /** Extracted attack bonus */
  attackBonus?: number;
  /** Extracted recharge notation */
  recharge?: string;
}

/**
 * Determines if a reference type should be parsed into structured data vs creating a reference
 */
function categorizeReference(referenceType: string): 'formatting' | 'document' | 'text' {
  // Parser already converts types to lowercase, so we can do direct lookup
  if (FORMATTING_REFERENCE_TYPES.has(referenceType)) {
    return 'formatting';
  }
  if (TEXT_REFERENCE_TYPES.has(referenceType)) {
    return 'text';
  }
  return 'document';
}

/**
 * Converts ability abbreviation to full name
 */
function convertAbilityToFull(abilityAbv: string): 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' {
  const abilityMap: Record<string, 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'> = {
    'str': 'strength',
    'dex': 'dexterity',
    'con': 'constitution', 
    'int': 'intelligence',
    'wis': 'wisdom',
    'cha': 'charisma'
  };
  return abilityMap[abilityAbv.toLowerCase()] || 'dexterity';
}

/**
 * Converts recharge notation from 5etools format to standard format
 */
function convertRecharge(rechargeValue: string): string {
  // Convert "5" to "5-6", "6" to "6", etc.
  const num = parseInt(rechargeValue, 10);
  if (num === 6) return '6';
  if (num >= 1 && num <= 5) return `${num}-6`;
  return rechargeValue;
}

/**
 * Extracts damage type from context around a damage expression
 */
function extractDamageType(text: string, damageMatch: string): string | undefined {
  // Look for damage type after the damage expression
  const damageTypes = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
    'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
  ];
  
  const damageIndex = text.indexOf(damageMatch);
  if (damageIndex === -1) return undefined;
  
  const afterDamage = text.slice(damageIndex + damageMatch.length).toLowerCase();
  for (const type of damageTypes) {
    if (afterDamage.includes(type)) {
      return type;
    }
  }
  return undefined;
}

/**
 * Parses action text to extract structured data and clean references
 */
export function parseActionData(actionText: string): ParsedActionData {
  const result: ParsedActionData = {
    description: actionText,
    references: []
  };
  
  let modifiedText = actionText;
  const allMatches = scanTextForReferences(actionText);
  
  // Process matches in reverse order to avoid index shifting
  const sortedMatches = [...allMatches].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const match of sortedMatches) {
    const category = categorizeReference(match.reference.type);
    
    if (category === 'formatting') {
      // Extract structured data and replace with clean text
      const replacement = processFormattingReference(match.reference, match.match, result, modifiedText);
      modifiedText = modifiedText.slice(0, match.startIndex) + replacement + modifiedText.slice(match.endIndex);
    } else if (category === 'document') {
      // Keep as document reference
      const refObject = transformToReferenceObject(match.reference);
      result.references.push(refObject);
      // Replace with clean text (just the name)
      modifiedText = modifiedText.slice(0, match.startIndex) + match.reference.name + modifiedText.slice(match.endIndex);
    } else if (category === 'text') {
      // Convert to plain text
      modifiedText = modifiedText.slice(0, match.startIndex) + match.reference.name + modifiedText.slice(match.endIndex);
    }
  }
  
  result.description = modifiedText;
  return result;
}

/**
 * Processes formatting references to extract structured data and return replacement text
 */
function processFormattingReference(reference: ParsedReference, originalMatch: string, result: ParsedActionData, fullText: string): string {
  // Parser converts types to lowercase, so use lowercase in switch cases
  switch (reference.type) {
    case 'dc': {
      const dc = parseInt(reference.name, 10);
      if (!isNaN(dc)) {
        // Look for preceding actSave to complete saving throw data
        if (result.savingThrow) {
          result.savingThrow.dc = dc;
        } else {
          result.savingThrow = { ability: 'dexterity', dc }; // Default to dex if no actSave found
        }
      }
      return `DC ${reference.name}`;
    }
    
    case 'actsave': {
      const ability = convertAbilityToFull(reference.name);
      if (result.savingThrow) {
        result.savingThrow.ability = ability;
      } else {
        result.savingThrow = { ability, dc: 10 }; // Default DC if none found
      }
      return `${ability.charAt(0).toUpperCase() + ability.slice(1)} saving throw`;
    }
    
    case 'damage': {
      if (!result.damage) {
        result.damage = reference.name;
        result.damageType = extractDamageType(fullText, originalMatch);
      }
      return reference.name;
    }
    
    case 'hit': {
      const bonus = parseInt(reference.name, 10);
      if (!isNaN(bonus) && !result.attackBonus) {
        result.attackBonus = bonus;
      }
      return reference.name.startsWith('+') ? reference.name : `+${reference.name}`;
    }
    
    case 'recharge': {
      if (!result.recharge) {
        result.recharge = convertRecharge(reference.name);
      }
      return `(Recharge ${convertRecharge(reference.name)})`;
    }
    
    case 'actsavefail':
      return 'Failure:';
    
    case 'actsavesuccess': 
      return 'Success:';
    
    case 'actsavesuccessorfail':
      return 'Failure or Success:';
    
    case 'h':
      return 'Hit:';
    
    case 'atk':
    case 'atkr':
      // Parse attack type if needed
      return reference.name.includes('m') ? 'Melee attack' : 
             reference.name.includes('r') ? 'Ranged attack' : 'Attack';
    
    default:
      return reference.name;
  }
}
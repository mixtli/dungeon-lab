/**
 * D&D 5e Runtime Types Index
 * 
 * This file exports all canonical D&D 5e runtime types used in MongoDB documents.
 * All document references in these types use MongoDB 'id' fields.
 * 
 * Compendium types are auto-derived from these with id→_ref conversion
 * and should be imported from the compendium directory when needed.
 */

// Common types and constants
export * from './common.mjs';

// Character and game element types
export * from './background.mjs';
export * from './character-class.mjs';
export * from './feat.mjs';
export * from './species.mjs';

// Game mechanic types
export * from './action.mjs';
export * from './condition.mjs';
export * from './rule.mjs';
export * from './sense.mjs';

// World and lore types
export * from './deity.mjs';
export * from './language.mjs';

// Equipment and magic types
export * from './item.mjs';
export * from './spell.mjs';

// Creature types
export * from './stat-block.mjs';
export * from './npc.mjs';
export * from './monster.mjs';

/**
 * All D&D document type identifiers for runtime types
 */
export const dndDocumentTypes = [
  'action',
  'background', 
  'character-class',
  'condition',
  'deity',
  'feat',
  'item',
  'language',
  'monster',
  'rule',
  'sense',
  'species',
  'spell'
] as const;

export type DndDocumentType = typeof dndDocumentTypes[number];

/**
 * Type guard to check if a string is a valid D&D document type
 */
export function isDndDocumentType(type: string): type is DndDocumentType {
  return dndDocumentTypes.includes(type as DndDocumentType);
}
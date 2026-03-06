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
export * from './common.js';

// Character and game element types
export * from './background.js';
export * from './character-class.js';
export * from './feat.js';
export * from './species.js';

// Game mechanic types
export * from './action.js';
export * from './condition.js';
export * from './rule.js';
export * from './sense.js';

// World and lore types
export * from './language.js';

// Equipment and magic types
export * from './item.js';
export * from './spell.js';

// Creature types
export * from './stat-block.js';
export * from './creature.js';

/**
 * All D&D document type identifiers for runtime types
 */
export const dndDocumentTypes = [
  'action',
  'background', 
  'character-class',
  'condition',
  'creature',
  'feat',
  'item',
  'language',
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
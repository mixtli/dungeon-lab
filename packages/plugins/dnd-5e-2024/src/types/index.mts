/**
 * D&D 5e 2024 Plugin Types
 * 
 * Complete type system for D&D 5e content including:
 * - Actor types (Character, NPC)
 * - Item types (Weapon, Equipment, Consumable, Tool, Loot, Container)
 * - Document types (Spell, Class, Background, Race, Feat, Subclass)
 * - Common schemas and utilities
 * - Validation functions
 * - Foundry VTT mapping utilities
 */

// Export all common schemas and types
export * from './common/index.mjs';

// Export all actor schemas and types
export * from './actors/index.mjs';

// Export all item schemas and types  
export * from './items/index.mjs';

// Export all document schemas and types
export * from './documents/index.mjs';

// Export validation functions and type discriminators
export * from './validation.mjs';

// Export Foundry mapping utilities
export * from './foundry-mapping.mjs';

/**
 * Re-export key types for convenience
 */
export type {
  // Actor Data Types
  CharacterData,
  NPCData
} from './actors/index.mjs';

export type {
  // Item Data Types
  BaseItemData,
  WeaponData,
  EquipmentData,
  ConsumableData,
  ToolData,
  LootData,
  ContainerData
} from './items/index.mjs';

export type {
  // Document Data Types
  SpellData,
  ClassData,
  BackgroundData,
  RaceData,
  FeatData,
  SubclassData
} from './documents/index.mjs';

export type {
  // Common Data Types
  Abilities,
  AbilityScore,
  Currency,
  Price,
  Damage,
  WeaponDamage,
  Skills,
  Movement,
  CreatureSize,
  Source,
  Description
} from './common/index.mjs';

export type {
  // Validation Types
  ActorData,
  ItemData,
  DocumentData,
  ValidationResult
} from './validation.mjs';

/**
 * Plugin type configuration for external consumption
 */
export const DND5E_TYPE_CONFIG = {
  // Supported actor types
  actorTypes: ['character', 'npc'] as const,
  
  // Supported item types
  itemTypes: ['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container'] as const,
  
  // Supported document types
  documentTypes: ['spell', 'class', 'background', 'race', 'feat', 'subclass'] as const,
  
  // Plugin metadata
  pluginId: 'dnd-5e-2024',
  gameSystemId: 'dnd5e',
  version: '1.0.0'
} as const;
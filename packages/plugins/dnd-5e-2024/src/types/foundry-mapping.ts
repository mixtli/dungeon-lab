/**
 * Foundry VTT to Dungeon Lab type mapping
 * Based on analysis of actual Foundry pack data
 */

/**
 * Maps Foundry actor types to our Actor types
 */
export const FOUNDRY_ACTOR_TYPE_MAPPING = {
  'character': 'character',
  'npc': 'npc',
  'vehicle': 'npc' // Vehicles use NPC schema structure
} as const;

/**
 * Maps Foundry item types to our Item types
 */
export const FOUNDRY_ITEM_TYPE_MAPPING = {
  // Weapons
  'weapon': 'weapon',
  
  // Equipment/Armor
  'equipment': 'equipment',
  
  // Consumables
  'consumable': 'consumable',
  'potion': 'consumable',
  'scroll': 'consumable',
  'ammo': 'consumable',
  
  // Tools
  'tool': 'tool',
  
  // Loot and treasure
  'loot': 'loot',
  'tradegoods': 'loot',
  
  // Containers
  'container': 'container',
  'backpack': 'container',
  
  // Base items (status effects/conditions from classes24 pack)
  'base': 'condition', // Base items in classes pack are status effects
  
  // Enchantments (magical modifications)
  'enchantment': 'loot', // Treat as special loot
  
  // Skip these Foundry organizational types
  'Item': 'SKIP', // Foundry folder items
  'folder': 'SKIP' // Foundry folders
} as const;

/**
 * Maps Foundry document types to our VTTDocument types
 */
export const FOUNDRY_DOCUMENT_TYPE_MAPPING = {
  // Spells
  'spell': 'spell',
  
  // Character options
  'background': 'background',
  'class': 'class',
  'subclass': 'subclass',
  'feat': 'feat',
  'race': 'race',
  
  // Status effects and conditions
  'base': 'condition',
  
  // Rules and reference
  'rule': 'reference',
  'text': 'reference',
  'document': 'reference',
  'unknown': 'reference', // Unknown journal content
  
  // Tables
  'RollTable': 'table',
  
  // Spell lists
  'spells': 'spell-list',
  
  // Skip these types
  'folder': 'SKIP' // Foundry folders
} as const;

/**
 * Complete mapping for all content types
 */
export const FOUNDRY_TYPE_MAPPING = {
  // Actors
  'character': { target: 'Actor', subtype: 'character' },
  'npc': { target: 'Actor', subtype: 'npc' },
  'vehicle': { target: 'Actor', subtype: 'npc' },
  
  // Items
  'weapon': { target: 'Item', subtype: 'weapon' },
  'equipment': { target: 'Item', subtype: 'equipment' },
  'consumable': { target: 'Item', subtype: 'consumable' },
  'tool': { target: 'Item', subtype: 'tool' },
  'loot': { target: 'Item', subtype: 'loot' },
  'container': { target: 'Item', subtype: 'container' },
  'base': { target: 'VTTDocument', subtype: 'condition' },
  'enchantment': { target: 'Item', subtype: 'loot' },
  
  // Documents
  'spell': { target: 'VTTDocument', subtype: 'spell' },
  'background': { target: 'VTTDocument', subtype: 'background' },
  'class': { target: 'VTTDocument', subtype: 'class' },
  'subclass': { target: 'VTTDocument', subtype: 'subclass' },
  'feat': { target: 'VTTDocument', subtype: 'feat' },
  'race': { target: 'VTTDocument', subtype: 'race' },
  'rule': { target: 'VTTDocument', subtype: 'reference' },
  'text': { target: 'VTTDocument', subtype: 'reference' },
  'document': { target: 'VTTDocument', subtype: 'reference' },
  'unknown': { target: 'VTTDocument', subtype: 'reference' },
  'RollTable': { target: 'VTTDocument', subtype: 'table' },
  'spells': { target: 'VTTDocument', subtype: 'spell-list' },
  
  // Skip
  'Item': { target: 'SKIP', subtype: 'folder' },
  'folder': { target: 'SKIP', subtype: 'folder' }
} as const;

/**
 * Helper functions for type mapping
 */
export function getTargetType(foundryType: string): 'Actor' | 'Item' | 'VTTDocument' | 'SKIP' {
  const mapping = FOUNDRY_TYPE_MAPPING[foundryType as keyof typeof FOUNDRY_TYPE_MAPPING];
  return mapping?.target || 'SKIP';
}

export function getTargetSubtype(foundryType: string): string | null {
  const mapping = FOUNDRY_TYPE_MAPPING[foundryType as keyof typeof FOUNDRY_TYPE_MAPPING];
  return mapping?.subtype || null;
}

export function shouldSkipType(foundryType: string): boolean {
  return getTargetType(foundryType) === 'SKIP';
}

/**
 * Document type mapping for VTTDocument documentType field
 */
export function getDocumentType(foundryType: string): string {
  const mapping = FOUNDRY_DOCUMENT_TYPE_MAPPING[foundryType as keyof typeof FOUNDRY_DOCUMENT_TYPE_MAPPING];
  return mapping || 'reference';
}

/**
 * Type guards for validation
 */
export function isValidActorType(type: string): type is keyof typeof FOUNDRY_ACTOR_TYPE_MAPPING {
  return type in FOUNDRY_ACTOR_TYPE_MAPPING;
}

export function isValidItemType(type: string): type is keyof typeof FOUNDRY_ITEM_TYPE_MAPPING {
  return type in FOUNDRY_ITEM_TYPE_MAPPING && FOUNDRY_ITEM_TYPE_MAPPING[type as keyof typeof FOUNDRY_ITEM_TYPE_MAPPING] !== 'SKIP';
}

export function isValidDocumentType(type: string): type is keyof typeof FOUNDRY_DOCUMENT_TYPE_MAPPING {
  return type in FOUNDRY_DOCUMENT_TYPE_MAPPING && FOUNDRY_DOCUMENT_TYPE_MAPPING[type as keyof typeof FOUNDRY_DOCUMENT_TYPE_MAPPING] !== 'SKIP';
}
/**
 * Equipment Action Parameter Types
 * 
 * Type definitions for equipment-related game actions in D&D 5e 2024.
 * Used for equipping and unequipping items on characters.
 */

/**
 * Parameters for equipping an item to a character
 */
export interface EquipItemParameters {
  /** Character ID to equip item on */
  characterId: string;
  
  /** Item ID to equip */
  itemId: string;
  
  /** Equipment slot to equip item in */
  slot: 'armor' | 'shield' | 'main-hand' | 'off-hand' | 'two-hand';
  
  /** Optional item name for logging and approval messages */
  itemName?: string;
}

/**
 * Parameters for unequipping an item from a character slot
 */
export interface UnequipItemParameters {
  /** Character ID to unequip item from */
  characterId: string;
  
  /** Equipment slot to clear */
  slot: 'armor' | 'shield' | 'main-hand' | 'off-hand' | 'two-hand';
  
  /** Optional item name for logging and approval messages */
  itemName?: string;
}

/**
 * Equipment slot type definition
 */
export type EquipmentSlot = 'armor' | 'shield' | 'main-hand' | 'off-hand' | 'two-hand';
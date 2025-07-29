/**
 * Item conversion utilities for 5etools data to D&D runtime schemas
 */

import type { 
  DndItemData, 
  DndWeaponData, 
  DndArmorData, 
  DndToolData, 
  DndGearData,
  ItemTypeIdentifier
} from '../../types/dnd/item.mjs';
import type { 
  DamageType,
  WeaponMasteryProperty
} from '../../types/dnd/common.mjs';

// Weapon properties and related types from the inline enums in item.mts
type WeaponProperty = 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading' | 'range' | 'reach' | 'special' | 'thrown' | 'two-handed' | 'versatile';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';

/**
 * 5etools item data interface (simplified - extend as needed)
 */
export interface EtoolsItem {
  name: string;
  source?: string;
  page?: number;
  type?: string;
  weight?: number;
  value?: number;
  rarity?: string;
  
  // Weapon properties
  weapon?: boolean;
  weaponCategory?: 'simple' | 'martial';
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  property?: string[];
  mastery?: string[];
  range?: string;
  
  // Armor properties  
  armor?: boolean;
  ac?: number;
  strength?: number;
  stealth?: boolean;
  
  // Tool properties
  tool?: boolean;
  toolCategory?: string;
  
  // Magic properties
  reqAttune?: boolean | string;
  charges?: number;
  
  // Other properties
  entries?: EtoolsEntry[];
}

/**
 * Damage type mapping from 5etools codes to our enum values
 */
const damageTypeMap: Record<string, DamageType> = {
  'S': 'slashing',
  'P': 'piercing', 
  'B': 'bludgeoning',
  'A': 'acid',
  'C': 'cold',
  'F': 'fire',
  'O': 'force',
  'L': 'lightning',
  'N': 'necrotic',
  'I': 'poison',
  'Y': 'psychic',
  'R': 'radiant',
  'T': 'thunder'
};

/**
 * Weapon property mapping from 5etools codes to our enum values
 */
const weaponPropertyMap: Record<string, WeaponProperty> = {
  'A': 'ammunition',
  'F': 'finesse', 
  'H': 'heavy',
  'L': 'light',
  'LD': 'loading',
  'R': 'range',
  'RCH': 'reach',
  'S': 'special',
  'T': 'thrown',
  '2H': 'two-handed',
  'V': 'versatile'
};

/**
 * Weapon mastery mapping from 5etools to our enum values
 */
const weaponMasteryMap: Record<string, WeaponMasteryProperty> = {
  'Cleave': 'cleave',
  'Graze': 'graze', 
  'Nick': 'nick',
  'Push': 'push',
  'Sap': 'sap',
  'Slow': 'slow',
  'Topple': 'topple',
  'Vex': 'vex'
};

/**
 * Determine item type from 5etools data
 */
export function determineItemType(etoolsItem: EtoolsItem): ItemTypeIdentifier {
  // Check explicit markers first
  if (etoolsItem.weapon) {
    return 'weapon';
  }
  if (etoolsItem.armor) {
    return 'armor';
  }
  if (etoolsItem.tool) {
    return 'tool';
  }
  
  // Check type codes
  if (etoolsItem.type) {
    const type = etoolsItem.type.split('|')[0]; // Remove source suffix
    
    switch (type) {
      case 'R': // Ranged weapon
      case 'M': // Melee weapon
        return 'weapon';
      case 'LA': // Light armor
      case 'MA': // Medium armor  
      case 'HA': // Heavy armor
        return 'armor';
      case 'S': // Shield (treat as armor)
        return 'armor';
      case 'AT': // Artisan tools
      case 'T': // Tools
      case 'INS': // Instruments
        return 'tool';
      case 'A': // Ammunition
      case 'G': // General gear
      default:
        return 'gear';
    }
  }
  
  // Default to gear
  return 'gear';
}

/**
 * Convert 5etools item to appropriate specialized schema
 */
export function convertItem(etoolsItem: EtoolsItem): DndItemData {
  const itemType = determineItemType(etoolsItem);
  
  switch (itemType) {
    case 'weapon':
      return convertWeapon(etoolsItem);
    case 'armor':
      // Handle both regular armor and shields as armor type
      if (etoolsItem.type?.startsWith('S')) {
        return convertShield(etoolsItem);
      }
      return convertArmor(etoolsItem);
    case 'tool':
      return convertTool(etoolsItem);
    case 'gear':
    default:
      return convertGear(etoolsItem);
  }
}

/**
 * Convert base item properties shared by all types
 */
function convertBaseProperties(etoolsItem: EtoolsItem) {
  const base: Partial<DndItemData> = {
    name: etoolsItem.name,
    description: formatDescription(etoolsItem.entries || []),
  };
  
  if (etoolsItem.source) base.source = etoolsItem.source;
  if (etoolsItem.page) base.page = etoolsItem.page;
  if (etoolsItem.weight) base.weight = etoolsItem.weight;
  
  if (etoolsItem.value) {
    base.cost = {
      amount: etoolsItem.value,
      currency: 'cp' as const // 5etools values are in copper pieces
    };
  }
  
  if (etoolsItem.rarity && etoolsItem.rarity !== 'none') {
    // Convert rarity to our enum values
    const rarityMap: Record<string, 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact'> = {
      'common': 'common',
      'uncommon': 'uncommon',
      'rare': 'rare',
      'very rare': 'very rare',
      'veryRare': 'very rare',
      'legendary': 'legendary',
      'artifact': 'artifact'
    };
    const mappedRarity = rarityMap[etoolsItem.rarity.toLowerCase()] || rarityMap[etoolsItem.rarity];
    if (mappedRarity) {
      base.rarity = mappedRarity;
      base.magical = true;
    }
  }
  
  if (etoolsItem.reqAttune) {
    base.attunement = true;
    // Note: Attunement requirements are stored in description for now
    // TODO: Consider adding attunementRequirements to schema if needed
  }
  
  return base;
}

/**
 * Convert weapon-specific data
 */
function convertWeapon(etoolsItem: EtoolsItem): DndWeaponData {
  const base = convertBaseProperties(etoolsItem);
  const isRanged = etoolsItem.type?.startsWith('R') || false;
  
  const weapon: DndWeaponData = {
    ...base,
    name: base.name || 'Unknown Weapon', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'weapon',
    damage: {
      dice: etoolsItem.dmg1 || '1d4',
      type: damageTypeMap[etoolsItem.dmgType || 'B'] || 'bludgeoning'
    },
    category: (etoolsItem.weaponCategory || 'simple') as 'simple' | 'martial',
    type: isRanged ? 'ranged' : 'melee',
    magical: base.magical || false, // Ensure boolean
    attunement: base.attunement || false // Ensure boolean
  };
  
  // Versatile damage
  if (etoolsItem.dmg2) {
    weapon.versatileDamage = {
      dice: etoolsItem.dmg2,
      type: damageTypeMap[etoolsItem.dmgType || 'B'] || 'bludgeoning'
    };
  }
  
  // Weapon properties - clean source suffixes like "F|XPHB"
  if (etoolsItem.property) {
    weapon.properties = etoolsItem.property
      .map(prop => {
        // Handle both string properties and object properties (like Lance's "2H unless mounted")
        if (typeof prop === 'string') {
          const cleanProp = prop.split('|')[0]; // Remove source suffix
          return weaponPropertyMap[cleanProp];
        } else if (typeof prop === 'object' && prop && typeof (prop as { uid?: string }).uid === 'string') {
          // Handle object properties with uid field
          const cleanProp = (prop as { uid: string }).uid.split('|')[0]; // Remove source suffix from uid
          return weaponPropertyMap[cleanProp];
        }
        return undefined;
      })
      .filter((prop): prop is WeaponProperty => prop !== undefined);
  }
  
  // Weapon mastery (2024) - single value, not array
  if (etoolsItem.mastery && Array.isArray(etoolsItem.mastery) && etoolsItem.mastery.length > 0) {
    const cleanMastery = etoolsItem.mastery[0].split('|')[0]; // Remove source suffix, take first
    const mappedMastery = weaponMasteryMap[cleanMastery];
    if (mappedMastery) {
      weapon.mastery = mappedMastery;
    }
  }
  
  // Range
  if (etoolsItem.range) {
    const rangeParts = etoolsItem.range.split('/');
    if (rangeParts.length >= 2) {
      weapon.range = {
        normal: parseInt(rangeParts[0]),
        long: parseInt(rangeParts[1])
      };
    }
  }
  
  return weapon;
}

/**
 * Convert armor-specific data
 */
function convertArmor(etoolsItem: EtoolsItem): DndArmorData {
  const base = convertBaseProperties(etoolsItem);
  const type = etoolsItem.type?.split('|')[0];
  
  let armorType: 'light' | 'medium' | 'heavy';
  switch (type) {
    case 'LA': armorType = 'light'; break;
    case 'MA': armorType = 'medium'; break;
    case 'HA': armorType = 'heavy'; break;
    default: armorType = 'light';
  }
  
  const armor: DndArmorData = {
    ...base,
    name: base.name || 'Unknown Armor', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'armor',
    armorClass: etoolsItem.ac || 10,
    type: armorType, // Schema expects 'type' not 'armorType'
    stealthDisadvantage: etoolsItem.stealth || false, // Default to false
    magical: base.magical || false, // Ensure boolean
    attunement: base.attunement || false // Ensure boolean
  };
  
  if (etoolsItem.strength) {
    armor.strengthRequirement = typeof etoolsItem.strength === 'string' ? parseInt(etoolsItem.strength) : etoolsItem.strength;
  }
  
  if (etoolsItem.stealth) {
    armor.stealthDisadvantage = true;
  }
  
  return armor;
}

/**
 * Convert shield-specific data (shields are treated as armor type 'shield')
 */
function convertShield(etoolsItem: EtoolsItem): DndArmorData {
  const base = convertBaseProperties(etoolsItem);
  
  return {
    ...base,
    name: base.name || 'Unknown Shield', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'armor',
    type: 'shield',
    armorClass: etoolsItem.ac || 2, // Shield provides AC bonus (usually +2)
    stealthDisadvantage: false, // Shields don't impose stealth disadvantage
    magical: base.magical || false,
    attunement: base.attunement || false
  } as DndArmorData;
}

/**
 * Convert tool-specific data
 */
function convertTool(etoolsItem: EtoolsItem): DndToolData {
  const base = convertBaseProperties(etoolsItem);
  
  // Determine tool category from type or name
  let category: 'artisan' | 'gaming-set' | 'musical-instrument' | 'other' = 'other';
  if (etoolsItem.type === 'INS') {
    category = 'musical-instrument';
  } else if (etoolsItem.name.toLowerCase().includes('gaming set')) {
    category = 'gaming-set';
  } else if (etoolsItem.name.toLowerCase().includes('tools')) {
    category = 'artisan';
  }
  
  return {
    ...base,
    name: base.name || 'Unknown Tool', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'tool',
    category,
    magical: base.magical || false,
    attunement: base.attunement || false
  } as DndToolData;
}

/**
 * Convert general gear data
 */
function convertGear(etoolsItem: EtoolsItem): DndGearData {
  const base = convertBaseProperties(etoolsItem);
  
  // Determine gear category
  let gearCategory: 'container' | 'consumable' | 'utility' | 'ammunition' | 'other' = 'other';
  const type = etoolsItem.type?.split('|')[0];
  
  if (type === 'A') {
    gearCategory = 'ammunition';
  } else if (etoolsItem.name.toLowerCase().includes('pack') || 
             etoolsItem.name.toLowerCase().includes('bag') ||
             etoolsItem.name.toLowerCase().includes('case')) {
    gearCategory = 'container';
  } else if (etoolsItem.name.toLowerCase().includes('rope') ||
             etoolsItem.name.toLowerCase().includes('pole') ||
             etoolsItem.name.toLowerCase().includes('ladder')) {
    gearCategory = 'utility';
  }
  
  return {
    ...base,
    name: base.name || 'Unknown Item', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'gear',
    category: gearCategory === 'utility' ? 'other' : gearCategory, // Map utility to other
    magical: base.magical || false, // Ensure boolean
    attunement: base.attunement || false // Ensure boolean
  } as DndGearData;
}

/**
 * Format item description from 5etools entries
 */
function formatDescription(entries: EtoolsEntry[]): string {
  if (!entries || entries.length === 0) {
    return '';
  }
  
  // Simple implementation - join string entries
  // TODO: Implement full 5etools entry formatting
  return entries
    .filter(entry => typeof entry === 'string')
    .join(' ')
    .trim() || 'No description available.';
}
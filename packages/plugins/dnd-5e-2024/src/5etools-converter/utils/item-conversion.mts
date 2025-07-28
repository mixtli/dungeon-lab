/**
 * Item conversion utilities for 5etools data to D&D runtime schemas
 */

import type { 
  DndItemData, 
  DndWeaponData, 
  DndArmorData, 
  DndShieldData, 
  DndToolData, 
  DndGearData,
  ItemTypeIdentifier,
  DamageTypeIdentifier,
  WeaponPropertyIdentifier,
  WeaponMasteryIdentifier
} from '../../types/dnd/item.mjs';
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
const damageTypeMap: Record<string, DamageTypeIdentifier> = {
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
const weaponPropertyMap: Record<string, WeaponPropertyIdentifier> = {
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
const weaponMasteryMap: Record<string, WeaponMasteryIdentifier> = {
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
      case 'S': // Shield
        return 'shield';
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
      return convertArmor(etoolsItem);
    case 'shield':
      return convertShield(etoolsItem);
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
    if (typeof etoolsItem.reqAttune === 'string') {
      base.attunementRequirements = etoolsItem.reqAttune;
    }
  }
  
  if (etoolsItem.charges) {
    base.charges = etoolsItem.charges;
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
    weaponCategory: etoolsItem.weaponCategory || 'simple',
    weaponType: isRanged ? 'ranged' : 'melee'
  };
  
  // Versatile damage
  if (etoolsItem.dmg2) {
    weapon.versatileDamage = {
      dice: etoolsItem.dmg2,
      type: damageTypeMap[etoolsItem.dmgType || 'B'] || 'bludgeoning'
    };
  }
  
  // Weapon properties
  if (etoolsItem.property) {
    weapon.properties = etoolsItem.property
      .map(prop => weaponPropertyMap[prop])
      .filter(Boolean) as WeaponPropertyIdentifier[];
  }
  
  // Weapon mastery (2024)
  if (etoolsItem.mastery) {
    weapon.mastery = etoolsItem.mastery
      .map(mastery => weaponMasteryMap[mastery])
      .filter(Boolean) as WeaponMasteryIdentifier[];
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
    armorType
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
 * Convert shield-specific data
 */
function convertShield(etoolsItem: EtoolsItem): DndShieldData {
  const base = convertBaseProperties(etoolsItem);
  
  return {
    ...base,
    name: base.name || 'Unknown Shield', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'shield',
    armorClassBonus: etoolsItem.ac || 2
  } as DndShieldData;
}

/**
 * Convert tool-specific data
 */
function convertTool(etoolsItem: EtoolsItem): DndToolData {
  const base = convertBaseProperties(etoolsItem);
  
  // Determine tool category from type or name
  let toolCategory: 'artisan' | 'gaming-set' | 'musical-instrument' | 'other' = 'other';
  if (etoolsItem.type === 'INS') {
    toolCategory = 'musical-instrument';
  } else if (etoolsItem.name.toLowerCase().includes('gaming set')) {
    toolCategory = 'gaming-set';
  } else if (etoolsItem.name.toLowerCase().includes('tools')) {
    toolCategory = 'artisan';
  }
  
  return {
    ...base,
    name: base.name || 'Unknown Tool', // Ensure required field
    description: base.description || 'No description available.', // Ensure required field
    itemType: 'tool',
    toolCategory
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
    gearCategory
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
import { IItemData } from '../shared/types/item.mjs';
import { toLowercase, cleanRuleText } from './converter-utils.mjs';

// Map of item type abbreviations to full names (will be populated when loading items-base.json)
const itemTypeMap: Record<string, string> = {};

// Map of item property abbreviations to full names and descriptions (will be populated when loading items-base.json)
const itemPropertyMap: Record<string, { name: string; description: string }> = {};

// Map of base items by name+source for quick lookup
const baseItemMap: Map<string, any> = new Map();

// Map of damage type codes to full names
const damageTypeMap: Record<string, string> = {
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

// Interface for the image data from fluff 
interface ImageData {
  path: string;
  credit?: string;
}

/**
 * Initialize the converter by loading reference data from items-base.json
 * @param baseItemsData Data from items-base.json
 */
export function initItemConverter(baseItemsData: any): void {
  // Clear existing maps
  Object.keys(itemTypeMap).forEach(key => delete itemTypeMap[key]);
  Object.keys(itemPropertyMap).forEach(key => delete itemPropertyMap[key]);
  baseItemMap.clear();

  // Add item types
  if (baseItemsData.itemType && Array.isArray(baseItemsData.itemType)) {
    for (const type of baseItemsData.itemType) {
      // Only include XPHB or XDMG sources
      if (type.source === 'XPHB' || type.source === 'XDMG') {
        itemTypeMap[type.abbreviation] = type.name;
      }
    }
  }

  // Add item properties - only process those from XPHB or XDMG
  if (baseItemsData.itemProperty && Array.isArray(baseItemsData.itemProperty)) {
    for (const prop of baseItemsData.itemProperty) {
      // Only include XPHB or XDMG sources
      if ((prop.source === 'XPHB' || prop.source === 'XDMG') && 
          Array.isArray(prop.entries) && 
          prop.entries.length > 0 && 
          prop.abbreviation) {
        
        const entry = prop.entries[0];
        if (entry.type === 'entries' && entry.name) {
          const description = Array.isArray(entry.entries) ? entry.entries.join('\n') : '';
          
          // Store with the source suffix as key
          itemPropertyMap[`${prop.abbreviation}|${prop.source}`] = {
            name: entry.name,
            description: cleanRuleText(description)
          };
          
          // Also store without source suffix as fallback
          if (!itemPropertyMap[prop.abbreviation]) {
            itemPropertyMap[prop.abbreviation] = {
              name: entry.name,
              description: cleanRuleText(description)
            };
          }
        }
      }
    }
  }

  // Add base items
  if (baseItemsData.baseitem && Array.isArray(baseItemsData.baseitem)) {
    for (const item of baseItemsData.baseitem) {
      // Only cache XPHB and XDMG sources
      if (item.source === 'XPHB' || item.source === 'XDMG') {
        const key = `${item.name}|${item.source}`.toLowerCase();
        baseItemMap.set(key, item);
      }
    }
  }
}

/**
 * Parse a cost value to get the numeric value and unit
 * @param value The cost value (e.g. 15 or "15 gp")
 * @returns Object with amount and unit
 */
function parseCost(value: number | string): { amount: number; unit: string } {
  if (typeof value === 'number') {
    return { amount: value, unit: 'cp' }; // Default to copper pieces
  }
  
  const match = String(value).match(/(\d+)\s*([a-z]{2})/i);
  if (match) {
    return {
      amount: parseInt(match[1], 10),
      unit: match[2].toLowerCase()
    };
  }
  
  return { amount: 0, unit: 'cp' };
}

/**
 * Convert a value in different coin units to copper pieces
 * @param amount The amount
 * @param unit The unit (cp, sp, ep, gp, pp)
 * @returns Value in copper pieces
 */
function convertToCp(amount: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'pp': return amount * 1000;   // 1 pp = 10 gp = 1000 cp
    case 'gp': return amount * 100;    // 1 gp = 100 cp
    case 'ep': return amount * 50;     // 1 ep = 5 sp = 50 cp
    case 'sp': return amount * 10;     // 1 sp = 10 cp
    case 'cp': return amount;
    default: return amount;
  }
}

/**
 * Extract full property names from property codes
 * @param properties Array of property codes
 * @returns Array of property names
 */
function extractPropertyNames(properties: any[]): string[] {
  if (!Array.isArray(properties)) return [];
  
  return properties
    .filter(prop => typeof prop === 'string') // Only process string properties
    .map(prop => {
      // Check for source-specific property (e.g. "2H|XPHB")
      const propKey = prop;
      const propWithoutSource = prop.split('|')[0];
      
      // Try to find the property with source first, then without source
      const property = itemPropertyMap[propKey] || itemPropertyMap[propWithoutSource];
      
      if (property && property.name) {
        return property.name;
      }
      
      // Fallback: use the code itself but strip any source suffix
      return propWithoutSource;
    });
}

/**
 * Determine item type category (weapon, armor, gear, tool, magic)
 * @param item The 5etools item data
 * @returns The item type category
 */
function determineItemType(item: any): string {
  // Check for weapon
  if (item.weapon === true) {
    return 'weapon';
  }
  
  // Check for armor
  if (item.armor === true) {
    return 'armor';
  }
  
  // Check for magic items
  if (item.rarity && item.rarity !== 'none') {
    return 'magic';
  }
  
  // Check for tools
  if (item.toolCategory || (item.type && item.type.includes('INS'))) {
    return 'tool';
  }
  
  // Default to gear
  return 'gear';
}

/**
 * Convert a damage type code to a full damage type name
 * @param code The damage type code (e.g. S, P, B)
 * @returns The full damage type name
 */
function mapDamageType(code: string): string {
  // If it's already a full damage type, return it
  if (code && code.length > 1 && !code.includes('|')) {
    return code.toLowerCase();
  }
  
  // If it's a code with a source (e.g. "S|XPHB"), extract just the code
  const simpleCode = code?.split('|')[0] || '';
  
  // Map it to a full damage type name
  return damageTypeMap[simpleCode] || 'slashing'; // Default to slashing if unknown
}

/**
 * Format a mastery property from the data source
 * @param mastery The mastery property from the data
 * @returns Formatted mastery property without source suffix
 */
function formatMasteryProperty(mastery: string | string[] | undefined): string | undefined {
  if (!mastery) return undefined;
  
  // If it's an array, use the first element
  const masteryValue = Array.isArray(mastery) ? mastery[0] : mastery;
  
  // Strip anything after a | character
  return masteryValue.split('|')[0];
}

/**
 * Parse an enhancement bonus value to extract the number
 * @param bonus The enhancement bonus value (e.g. "+1" or 2)
 * @returns The numeric bonus value or undefined if invalid
 */
function parseEnhancementBonus(bonus: any): number | undefined {
  if (bonus === undefined || bonus === null) return undefined;
  
  // If it's already a number, return it
  if (typeof bonus === 'number') return bonus;
  
  // If it's a string, try to extract the number
  if (typeof bonus === 'string') {
    const match = bonus.match(/[+-]?\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  
  return undefined;
}

/**
 * Convert a 5etools item to our format
 * @param sourceItemData The 5etools item data
 * @param fluffData Optional fluff data for the item
 * @returns Converted item data and optional image path
 */
export function convert5eToolsItem(sourceItemData: any, fluffData?: any): { 
  item: { 
    name: string; 
    type: string; 
    description?: string; 
    weight?: number; 
    cost?: number; 
    data: IItemData;
  }; 
  imagePath?: string;
} {
  // Check if this item extends a base item
  let baseItem: any = null;
  if (sourceItemData.baseItem) {
    const baseItemKey = sourceItemData.baseItem.toLowerCase();
    baseItem = baseItemMap.get(baseItemKey);
  }
  
  // Extract image path from fluff data if available
  let imagePath: string | undefined;
  if (fluffData) {
    if (fluffData.images?.[0]?.href?.path) {
      imagePath = fluffData.images[0].href.path;
    } else if (fluffData._copy?._mod?.images?.items?.[0]?.href?.path) {
      imagePath = fluffData._copy._mod.images.items[0].href.path;
    }
  }
  
  // Parse cost
  let costAmount = 0;
  let costUnit = 'cp';
  if (sourceItemData.value) {
    const parsed = parseCost(sourceItemData.value);
    costAmount = convertToCp(parsed.amount, parsed.unit);
    costUnit = parsed.unit;
  }
  
  // Extract text entries
  let description = '';
  if (Array.isArray(sourceItemData.entries)) {
    description = sourceItemData.entries.map((entry: any) => {
      if (typeof entry === 'string') {
        return cleanRuleText(entry);
      } else if (entry.type === 'entries' && Array.isArray(entry.entries)) {
        return cleanRuleText(entry.entries.join('\n'));
      }
      return '';
    }).filter(Boolean).join('\n\n');
  }
  
  // Determine item type
  const type = sourceItemData.type || '';
  let fullType = '';
  
  if (type.includes('|')) {
    const [abbr, source] = type.split('|');
    fullType = itemTypeMap[abbr] || abbr;
  } else {
    fullType = itemTypeMap[type] || type;
  }
  
  // Determine the detailed item type
  const itemType = determineItemType(sourceItemData);
  
  // Prepare specialized data based on item type
  let resultData: IItemData;
  
  switch (itemType) {
    case 'weapon': {
      resultData = {
        type: 'weapon',
        damage: sourceItemData.dmg1 || '',
        damageType: mapDamageType(sourceItemData.dmgType),
        range: sourceItemData.range ? 
          (typeof sourceItemData.range === 'string' ? 'melee' : {
            normal: sourceItemData.range.normal || 0,
            long: sourceItemData.range.long
          }) : 'melee',
        properties: extractPropertyNames(sourceItemData.property || []),
        masteryProperty: formatMasteryProperty(sourceItemData.mastery)
      };
      break;
    }
      
    case 'armor': {
      resultData = {
        type: 'armor',
        armorType: fullType,
        armorClass: sourceItemData.ac || 0,
        dexterityModifier: sourceItemData.dexterityModifier !== false,
        maxDexterityModifier: sourceItemData.maxDexBonus || undefined,
        minimumStrength: sourceItemData.strength ? parseInt(sourceItemData.strength, 10) : undefined,
        stealthDisadvantage: sourceItemData.stealth === true,
        specialProperties: {}
      };
      break;
    }
      
    case 'tool': {
      resultData = {
        type: 'tool',
        ability: sourceItemData.ability || undefined,
        usage: sourceItemData.toolCategory || undefined,
        specialProperties: {}
      };
      break;
    }
      
    case 'magic': {
      resultData = {
        type: 'magic',
        magicType: fullType,
        rarity: sourceItemData.rarity || undefined,
        attunement: sourceItemData.reqAttune !== undefined && sourceItemData.reqAttune !== false,
        attunementRequirements: typeof sourceItemData.reqAttune === 'string' ? sourceItemData.reqAttune : undefined,
        charges: sourceItemData.charges || undefined,
        rechargeable: sourceItemData.recharge !== undefined,
        rechargeRate: sourceItemData.recharge || undefined,
        activation: sourceItemData.activation || undefined,
        enhancementBonus: parseEnhancementBonus(sourceItemData.bonusWeapon || sourceItemData.bonusAc),
        specialProperties: {}
      };
      break;
    }
      
    case 'gear':
    default: {
      resultData = {
        type: 'gear',
        usage: fullType,
        properties: extractPropertyNames(sourceItemData.property || []),
        specialProperties: {}
      };
      break;
    }
  }
  
  // Return the item with external data for the item model
  return { 
    item: {
      name: toLowercase(sourceItemData.name || ''),
      type: itemType,
      description: description || undefined,
      weight: sourceItemData.weight || undefined,
      cost: costAmount,
      data: resultData
    }, 
    imagePath 
  };
} 
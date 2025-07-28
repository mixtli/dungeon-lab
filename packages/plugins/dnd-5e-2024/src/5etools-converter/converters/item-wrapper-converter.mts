/**
 * Item converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateItemData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { EtoolsItem, EtoolsItemData, EtoolsItemWeight, EtoolsItemValue, EtoolsItemRange, EtoolsItemAC } from '../../5etools-types/items.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { convertItem, determineItemType, type EtoolsItem as EtoolsItemConverted } from '../utils/item-conversion.mjs';

/**
 * Item fluff data interface
 */
interface EtoolsItemFluff {
  name: string;
  source?: string;
  entries?: EtoolsEntry[];
  images?: Array<{
    type: string;
    href: {
      type: string;
      path: string;
    };
  }>;
  _copy?: {
    _mod?: {
      images?: {
        items?: Array<{
          href: {
            path: string;
          };
        }>;
      };
    };
  };
}

/**
 * Item fluff data file structure
 */
interface EtoolsItemFluffData {
  itemFluff?: EtoolsItemFluff[];
}

// Item type mapping
const ITEM_TYPE_MAP: Record<string, string> = {
  'M': 'Melee Weapon',
  'R': 'Ranged Weapon', 
  'A': 'Ammunition',
  'LA': 'Light Armor',
  'MA': 'Medium Armor',
  'S': 'Shield',
  'G': 'Adventuring Gear',
  'AT': 'Artisan Tools',
  'T': 'Tools',
  '$': 'Treasure',
  'WD': 'Wondrous Item'
};

// Rarity order for sorting
const RARITY_ORDER: Record<string, number> = {
  'common': 100,
  'uncommon': 200,
  'rare': 300,
  'very rare': 400,
  'legendary': 500,
  'artifact': 600
};

export class ItemWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting item wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read fluff data for descriptions and images
      const rawFluffData = await readEtoolsData('fluff-items.json');
      const fluffData = safeEtoolsCast<EtoolsItemFluffData>(rawFluffData, [], 'item fluff data file');
      const fluffMap = new Map<string, EtoolsItemFluff>();
      if (fluffData.itemFluff) {
        for (const fluff of fluffData.itemFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }

      // Read item data from both files
      const itemFiles = [
        { data: 'items.json', type: 'magic' },
        { data: 'items-base.json', type: 'base' }
      ];
      
      for (const fileSet of itemFiles) {
        try {
          const rawItemData = await readEtoolsData(fileSet.data);
          
          // Don't validate structure since items-base.json has 'baseitem' instead of 'item'
          const itemData = rawItemData as EtoolsItemData;
          
          // Handle both item and baseitem arrays
          let items: EtoolsItem[] = [];
          if (fileSet.data === 'items-base.json' && itemData.baseitem) {
            items = itemData.baseitem;
          } else if (itemData.item) {
            items = itemData.item;
          } else {
            this.log(`No items found in ${fileSet.data}`);
            continue;
          }
          
          const filteredItems = this.options.srdOnly ? filterSrdContent(items) : items;
          
          stats.total += filteredItems.length;
          this.log(`Processing ${filteredItems.length} items from ${fileSet.data}`);

          for (let i = 0; i < filteredItems.length; i++) {
            const itemRaw = filteredItems[i];
            try {
              const fluff = fluffMap.get(itemRaw.name);
              const { item, assetPath, validationResult } = await this.convertItem(itemRaw, fluff);

              // Check validation result
              if (!validationResult.success) {
                this.log(`❌ Item ${itemRaw.name} failed validation:`, validationResult.errors);
                stats.errors++;
                continue; // Skip this item and continue with next
              }

              // Log successful validation
              this.log(`✅ Item ${itemRaw.name} validated successfully`);

              // Create wrapper format using the full document structure
              const wrapper = this.createWrapper(
                item.name,
                item, // Always use the full structure for proper directory mapping
                'item',
                {
                  imageId: assetPath,
                  category: this.determineCategory(itemRaw, 'item'),
                  tags: this.extractTags(itemRaw, 'item'),
                  sortOrder: this.calculateSortOrder(itemRaw, 'item') + i
                }
              );
              
              content.push({
                type: 'item',
                wrapper,
                originalPath: fileSet.data
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting item ${itemRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file set ${fileSet.data}:`, error);
          stats.errors++;
        }
      }

      this.log(`Item wrapper conversion complete. Stats:`, stats);
      
      return {
        success: true,
        content,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private async convertItem(itemData: EtoolsItem, fluffData?: EtoolsItemFluff): Promise<{ item: {
    id: string;
    slug: string;
    name: string;
    pluginId: string;
    campaignId: string;
    documentType: string;
    description: string;
    userData: Record<string, unknown>;
    pluginDocumentType: string;
    pluginData: unknown;
  }; assetPath?: string; validationResult: ValidationResult }> {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    // Convert the 5etools item data to our specialized schema
    const itemConversionData: EtoolsItemConverted = {
      name: itemData.name,
      source: itemData.source,
      page: itemData.page,
      type: itemData.type,
      weight: this.convertWeight(itemData.weight),
      value: this.convertValue(itemData.value),
      rarity: itemData.rarity,
      
      // Weapon properties
      weapon: (() => {
        const type = itemData.type?.split('|')[0]; // Remove source suffix
        return itemData.weaponCategory !== undefined || type === 'M' || type === 'R';
      })(),
      weaponCategory: this.convertWeaponCategory(itemData.weaponCategory),
      dmg1: itemData.dmg1,
      dmg2: itemData.dmg2,
      dmgType: itemData.dmgType,
      property: itemData.property,
      mastery: itemData.mastery,
      range: this.convertRange(itemData.range),
      
      // Armor properties
      armor: (() => {
        const type = itemData.type?.split('|')[0]; // Remove source suffix
        return itemData.armor || type === 'LA' || type === 'MA' || type === 'S';
      })(),
      ac: this.convertAC(itemData.ac),
      strength: this.convertStrength(itemData.strength),
      stealth: itemData.stealth,
      
      // Tool properties  
      tool: (() => {
        const type = itemData.type?.split('|')[0]; // Remove source suffix
        return type === 'AT' || type === 'T' || type === 'INS';
      })(),
      
      // Magic properties
      reqAttune: itemData.reqAttune,
      charges: this.convertCharges(itemData.charges),
      
      // Description
      entries: itemData.entries || (fluffData?.entries ? fluffData.entries : [])
    };

    // Use our conversion utility to get properly typed item data
    const convertedItem = convertItem(itemConversionData);

    // Override description with fluff data if available
    if (fluffData?.entries) {
      convertedItem.description = formatEntries(fluffData.entries);
    } else if (!convertedItem.description || convertedItem.description === 'No description available.') {
      convertedItem.description = this.buildDescription(itemData, fluffData);
    }

    // Create full document structure for output
    const item = {
      id: `item-${this.generateSlug(convertedItem.name)}`,
      slug: this.generateSlug(convertedItem.name),
      name: convertedItem.name,
      pluginId: 'dnd-5e-2024',
      campaignId: '',
      documentType: 'item' as const, // Items use 'item' documentType
      description: convertedItem.description,
      userData: {},
      pluginDocumentType: convertedItem.itemType, // weapon, armor, shield, tool, gear
      pluginData: convertedItem
    };

    // Validate the constructed item data against the schema
    const validationResult = await validateItemData(convertedItem);

    return { item, assetPath, validationResult };
  }

  private buildDescription(itemData: EtoolsItem, fluffData?: EtoolsItemFluff): string {
    let description = '';
    
    // Use fluff description if available
    if (fluffData?.entries) {
      description = formatEntries(fluffData.entries);
    } else if (itemData.entries) {
      description = formatEntries(itemData.entries);
    }
    
    // Fallback description
    if (!description) {
      const type = ITEM_TYPE_MAP[itemData.type] || 'item';
      const rarity = itemData.rarity || 'common';
      description = `A ${rarity} ${type.toLowerCase()}.`;
    }
    
    return description.trim();
  }


  private convertWeaponCategory(category: string | undefined): "simple" | "martial" | undefined {
    if (!category) return undefined;
    if (category === 'simple' || category === 'martial') return category;
    return undefined;
  }

  /**
   * Override category determination for items
   */
  protected determineCategory<T = EtoolsItem>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string | undefined {
    if (contentType === 'item' && sourceData && typeof sourceData === 'object') {
      const item = sourceData as unknown as EtoolsItem;
      
      // Convert to our conversion format for type determination
      const type = item.type?.split('|')[0]; // Remove source suffix
      const conversionItem: EtoolsItemConverted = {
        name: item.name || '',
        type: item.type,
        weapon: item.weaponCategory !== undefined || type === 'M' || type === 'R',
        weaponCategory: this.convertWeaponCategory(item.weaponCategory),
        armor: item.armor || type === 'LA' || type === 'MA' || type === 'S',
        tool: type === 'AT' || type === 'T' || type === 'INS'
      };
      
      const itemType = determineItemType(conversionItem);
      
      switch (itemType) {
        case 'weapon':
          if (item.weaponCategory === 'martial') {
            return 'Martial Weapons';
          }
          return 'Simple Weapons';
          
        case 'armor': {
          const type = item.type?.split('|')[0];
          switch (type) {
            case 'LA': return 'Light Armor';
            case 'MA': return 'Medium Armor';
            case 'HA': return 'Heavy Armor';
            default: return 'Armor';
          }
        }
          
        case 'shield':
          return 'Shields';
          
        case 'tool':
          if (item.type === 'INS') {
            return 'Musical Instruments';
          }
          return 'Tools';
          
        case 'gear':
        default:
          if (item.type === 'A') {
            return 'Ammunition';
          }
          if (item.wondrous) {
            return 'Wondrous Items';
          }
          if (item.charges || item.recharge) {
            return 'Consumables';
          }
          return 'Adventuring Gear';
      }
    }
    
    return super.determineCategory(sourceData, contentType);
  }

  /**
   * Override tag extraction for items
   */
  protected extractTags<T = EtoolsItem>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): string[] {
    const baseTags = super.extractTags(sourceData, contentType);
    
    if (contentType === 'item') {
      // Add item-specific tags
      if (sourceData && typeof sourceData === 'object' && 'rarity' in sourceData && 
          typeof sourceData.rarity === 'string' && sourceData.rarity !== 'none' && sourceData.rarity !== 'common') {
        baseTags.push(sourceData.rarity.charAt(0).toUpperCase() + sourceData.rarity.slice(1));
      }
      if (sourceData && typeof sourceData === 'object' && 'reqAttune' in sourceData && sourceData.reqAttune) {
        baseTags.push('Requires Attunement');
      }
      if (sourceData && typeof sourceData === 'object' && 'weaponCategory' in sourceData && 
          typeof sourceData.weaponCategory === 'string') {
        baseTags.push(sourceData.weaponCategory);
      }
      if (sourceData && typeof sourceData === 'object' && 'wondrous' in sourceData && sourceData.wondrous) {
        baseTags.push('Wondrous');
      }
    }
    
    return baseTags;
  }

  /**
   * Override sort order calculation for items
   */
  protected calculateSortOrder<T = EtoolsItem>(sourceData: T, contentType: 'actor' | 'item' | 'vtt-document'): number {
    if (contentType === 'item') {
      // Sort by rarity, then alphabetically
      if (sourceData && typeof sourceData === 'object' && 'rarity' in sourceData && 
          typeof sourceData.rarity === 'string') {
        return RARITY_ORDER[sourceData.rarity as keyof typeof RARITY_ORDER] || 0;
      }
      return 0;
    }
    return super.calculateSortOrder(sourceData, contentType);
  }


  /**
   * Convert range to simple string
   */
  private convertRange(range: string | EtoolsItemRange | undefined): string | undefined {
    if (range === undefined) return undefined;
    if (typeof range === 'string') return range;
    if (typeof range === 'object' && range !== null) {
      // Handle complex range object
      return `${range.short || ''}/${range.long || ''}`;
    }
    return undefined;
  }

  /**
   * Convert AC to simple number
   */
  private convertAC(ac: number | EtoolsItemAC | undefined): number | undefined {
    if (ac === undefined) return undefined;
    if (typeof ac === 'number') return ac;
    if (typeof ac === 'object' && ac !== null) {
      // Assume EtoolsItemAC has a base property
      return ac.ac || 0;
    }
    return undefined;
  }

  /**
   * Convert strength requirement to number
   */
  private convertStrength(strength: string | undefined): number | undefined {
    if (!strength) return undefined;
    const parsed = parseInt(strength);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Convert charges to number
   */
  private convertCharges(charges: string | number | undefined): number | undefined {
    if (charges === undefined) return undefined;
    if (typeof charges === 'number') return charges;
    if (typeof charges === 'string') {
      const parsed = parseInt(charges);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  /**
   * Convert 5etools weight to simple number
   */
  private convertWeight(weight: EtoolsItemWeight | undefined): number | undefined {
    if (weight === undefined) return undefined;
    if (typeof weight === 'number') return weight;
    if (typeof weight === 'string') {
      const parsed = parseFloat(weight);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  /**
   * Convert 5etools value to simple number
   */
  private convertValue(value: number | EtoolsItemValue | undefined): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      // Assume EtoolsItemValue has an amount property
      return value.value || 0;
    }
    return undefined;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
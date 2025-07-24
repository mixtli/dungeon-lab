/**
 * Item converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsItem, EtoolsItemData } from '../../5etools-types/items.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { itemSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { z } from 'zod';

type IItem = z.infer<typeof itemSchema>;

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
          const itemData = safeEtoolsCast<EtoolsItemData>(rawItemData, ['item'], `item data file ${fileSet.data}`);
          const items = extractEtoolsArray<EtoolsItem>(itemData, 'item', `item list in ${fileSet.data}`);
          const filteredItems = this.options.srdOnly ? filterSrdContent(items) : items;
          
          stats.total += filteredItems.length;
          this.log(`Processing ${filteredItems.length} items from ${fileSet.data}`);

          for (let i = 0; i < filteredItems.length; i++) {
            const itemRaw = filteredItems[i];
            try {
              const fluff = fluffMap.get(itemRaw.name);
              const { item, assetPath } = this.convertItem(itemRaw, fluff);

              // Create wrapper format
              const wrapper = this.createWrapper(
                item.name,
                item,
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

  private convertItem(itemData: EtoolsItem, fluffData?: EtoolsItemFluff): { item: IItem; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    const item: IItem = {
      id: `item-${this.generateSlug(itemData.name)}`, // Temporary ID for wrapper format
      name: itemData.name,
      type: this.determineItemSubtype(itemData),
      pluginId: 'dnd-5e-2024',
      gameSystemId: 'dnd-5e-2024',
      description: this.buildDescription(itemData, fluffData),
      
      // Item-specific data
      data: {
        // Basic properties
        type: this.determineItemSubtype(itemData),
        rarity: itemData.rarity || 'common',
        attunement: itemData.reqAttune !== undefined,
        
        // Physical properties
        weight: itemData.weight,
        value: this.extractValue(itemData.value),
        
        // Weapon properties
        weapon: this.isWeapon(itemData) ? {
          category: itemData.weaponCategory,
          damage: this.parseDamage(itemData.dmg1),
          damageType: itemData.dmgType,
          properties: itemData.property || [],
          range: this.parseRange(itemData.range)
        } : undefined,
        
        // Armor properties
        armor: this.isArmor(itemData) ? {
          armorClass: this.parseArmorClass(itemData.ac),
          category: itemData.type,
          stealthDisadvantage: itemData.stealth === true,
          strengthRequirement: itemData.strength
        } : undefined,
        
        // Magic item properties
        charges: itemData.charges,
        recharge: itemData.recharge,
        curse: itemData.curse,
        
        // Source information
        source: itemData.source || 'PHB',
        page: itemData.page
      }
    };

    return { item, assetPath };
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private determineItemSubtype(itemData: EtoolsItem): string {
    if (this.isWeapon(itemData)) {
      return 'weapon';
    }
    if (this.isArmor(itemData)) {
      return 'equipment';
    }
    if (itemData.wondrous === true) {
      return 'loot';
    }
    if (itemData.type === 'AT' || itemData.type === 'T') {
      return 'tool';
    }
    if (itemData.charges || itemData.recharge) {
      return 'consumable';
    }
    return 'loot';
  }

  private isWeapon(itemData: EtoolsItem): boolean {
    return itemData.weaponCategory !== undefined || 
           itemData.type === 'M' || 
           itemData.type === 'R' ||
           itemData.type === 'A';
  }

  private isArmor(itemData: EtoolsItem): boolean {
    return itemData.armor === true || 
           itemData.type === 'LA' || 
           itemData.type === 'MA' || 
           itemData.type === 'S';
  }

  private extractValue(valueData: EtoolsItem['value']): number | undefined {
    if (!valueData) return undefined;
    
    if (typeof valueData === 'number') return valueData;
    
    // Handle EtoolsItemValue object
    if (typeof valueData === 'object' && 'value' in valueData) {
      return valueData.value;
    }
    
    return undefined;
  }

  private parseDamage(damageData: EtoolsItem['dmg1']): string | undefined {
    if (!damageData) return undefined;
    if (typeof damageData === 'string') return damageData;
    return undefined;
  }

  private parseRange(rangeData: EtoolsItem['range']): { normal?: number; long?: number } | undefined {
    if (!rangeData) return undefined;
    
    if (typeof rangeData === 'number') {
      return { normal: rangeData };
    }
    
    if (typeof rangeData === 'string') {
      const match = rangeData.match(/(\d+)(?:\/(\d+))?/);
      if (match) {
        return {
          normal: parseInt(match[1]),
          long: match[2] ? parseInt(match[2]) : undefined
        };
      }
    }
    
    return undefined;
  }

  private parseArmorClass(acData: EtoolsItem['ac']): number | undefined {
    if (typeof acData === 'number') return acData;
    if (Array.isArray(acData) && acData.length > 0) {
      return typeof acData[0] === 'number' ? acData[0] : undefined;
    }
    return undefined;
  }

  /**
   * Override category determination for items
   */
  protected determineCategory<T = EtoolsItem>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'item') {
      // Categorize by item type
      if (this.isWeapon(sourceData as EtoolsItem)) {
        return 'Weapons';
      }
      if (this.isArmor(sourceData as EtoolsItem)) {
        return 'Armor & Shields';
      }
      if (sourceData && typeof sourceData === 'object' && 'wondrous' in sourceData && sourceData.wondrous === true) {
        return 'Wondrous Items';
      }
      if (sourceData && typeof sourceData === 'object' && 'type' in sourceData && 
          (sourceData.type === 'AT' || sourceData.type === 'T')) {
        return 'Tools';
      }
      if (sourceData && typeof sourceData === 'object' && 
          (('charges' in sourceData && sourceData.charges) || ('recharge' in sourceData && sourceData.recharge))) {
        return 'Consumables';
      }
      return 'Adventuring Gear';
    }
    return super.determineCategory(sourceData, contentType);
  }

  /**
   * Override tag extraction for items
   */
  protected extractTags<T = EtoolsItem>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): string[] {
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
  protected calculateSortOrder<T = EtoolsItem>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): number {
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
}
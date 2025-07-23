/**
 * Item converter for 5etools data to compendium format  
 */
import { BaseConverter, ConversionResult, ConvertedContent } from './base-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from './conversion-utils.mjs';

export class ItemConverter extends BaseConverter {
  async convert(): Promise<ConversionResult> {
    try {
      this.log('Starting item conversion...');
      
      const content: ConvertedContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read fluff data
      const fluffData = await readEtoolsData('fluff-items.json');
      const fluffMap = new Map();
      if (fluffData.itemFluff) {
        for (const fluff of fluffData.itemFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }

      // Read item data from both files
      const itemFiles = ['items.json', 'items-base.json'];
      
      for (const filename of itemFiles) {
        try {
          const itemData = await readEtoolsData(filename);
          const items = itemData.item || [];
          const filteredItems = this.options.srdOnly ? filterSrdContent(items) : items;
          
          stats.total += filteredItems.length;
          this.log(`Processing ${filteredItems.length} items from ${filename}`);

          for (const itemRaw of filteredItems) {
            try {
              const fluff = fluffMap.get(itemRaw.name);
              const { item, assetPath } = this.convertItem(itemRaw, fluff);
              
              content.push({
                type: 'item',
                subtype: this.determineItemType(itemRaw),
                name: item.name,
                data: item,
                originalPath: filename,
                assetPath
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting item ${itemRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${filename}:`, error);
          stats.errors++;
        }
      }

      this.log(`Item conversion complete. Stats:`, stats);
      
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

  private convertItem(itemData: any, fluffData?: any): { item: any; assetPath?: string } {
    const item: any = {
      name: itemData.name || '',
      type: this.determineItemType(itemData),
      description: this.cleanRuleText(formatEntries(itemData.entries || [])),
      rarity: itemData.rarity || 'common',
      source: itemData.source || 'XPHB',
      page: itemData.page,
      weight: itemData.weight,
      value: this.extractValue(itemData.value),
      attunement: itemData.reqAttune !== undefined
    };

    // Add weapon-specific properties
    if (this.isWeapon(itemData)) {
      item.weaponCategory = itemData.weaponCategory;
      item.damage = itemData.dmg1;
      item.damageType = itemData.dmgType;
      item.properties = itemData.property || [];
      item.range = itemData.range;
    }

    // Add armor-specific properties
    if (this.isArmor(itemData)) {
      item.armorClass = itemData.ac;
      item.armorCategory = itemData.type;
      item.stealthDisadvantage = itemData.stealthDisadvantage;
      item.strengthRequirement = itemData.strength;
    }

    // Add magic item properties
    if (itemData.wondrous || itemData.rarity !== 'none') {
      item.charges = itemData.charges;
      item.recharge = itemData.recharge;
      item.curse = itemData.curse;
    }

    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    return { item, assetPath };
  }

  private determineItemType(itemData: any): string {
    if (itemData.type) {
      const type = itemData.type.toLowerCase();
      if (type.includes('weapon')) return 'weapon';
      if (type.includes('armor')) return 'equipment';
      if (type.includes('shield')) return 'equipment';
    }
    
    if (itemData.weaponCategory) return 'weapon';
    if (itemData.armor === true) return 'equipment';
    if (itemData.wondrous === true) return 'loot';
    if (itemData.type === 'G') return 'loot'; // Gear
    if (itemData.type === 'AT') return 'tool'; // Artisan's tools
    if (itemData.type === 'T') return 'tool'; // Tools
    if (itemData.type === '$') return 'loot'; // Treasure
    if (itemData.charges || itemData.recharge) return 'consumable';
    
    return 'loot';
  }

  private isWeapon(itemData: any): boolean {
    return itemData.weaponCategory !== undefined || 
           (itemData.type && itemData.type.toLowerCase().includes('weapon'));
  }

  private isArmor(itemData: any): boolean {
    return itemData.armor === true || 
           (itemData.type && (itemData.type.toLowerCase().includes('armor') || itemData.type.toLowerCase().includes('shield')));
  }

  private extractValue(valueData: any): number | undefined {
    if (!valueData) return undefined;
    
    if (typeof valueData === 'number') return valueData;
    
    // Handle complex value formats like "50 gp"
    if (typeof valueData === 'string') {
      const match = valueData.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : undefined;
    }
    
    return undefined;
  }
}
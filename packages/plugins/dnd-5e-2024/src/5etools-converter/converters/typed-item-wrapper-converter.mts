/**
 * Type-safe item wrapper converter
 * 
 * Bridges the enhanced typed item pipeline with the existing wrapper system
 * for compendium generation. Handles multiple item types (weapons, armor, gear, tools)
 * and provides complete validation while maintaining compatibility with the current
 * compendium format.
 */

import { TypedItemConverter } from '../pipeline/typed-item-converter.mjs';
import type { WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import type { ConversionOptions } from '../pipeline/typed-converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';
import type { ItemDocument } from '../validation/typed-document-validators.mjs';

/**
 * Wrapper converter that bridges typed item converter with compendium format
 */
export class TypedItemWrapperConverter {
  private readonly typedConverter: TypedItemConverter;

  constructor(options: ConversionOptions = {}) {
    this.typedConverter = new TypedItemConverter(options);
  }

  /**
   * Convert all items using the typed pipeline
   */
  async convert(): Promise<WrapperConversionResult> {
    try {
      console.log('[TypedItemWrapperConverter] Starting item conversion...');
      const result = await this.typedConverter.convertItems();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: { total: result.stats.total, converted: 0, skipped: 0, errors: result.stats.errors }
        };
      }

      const wrapperContent: WrapperContent[] = [];
      
      // Convert each item document to wrapper format
      for (const itemDoc of result.results) {
        const wrapper = this.createItemWrapper(itemDoc);
        wrapperContent.push({ type: 'item', wrapper });
      }

      console.log(`[TypedItemWrapperConverter] Converted ${result.results.length} items`);
      
      return {
        success: true,
        content: wrapperContent,
        stats: {
          total: result.stats.total,
          converted: result.stats.converted,
          skipped: result.stats.total - result.stats.converted,
          errors: result.stats.errors
        }
      };
    } catch (error) {
      const errorMessage = `Item wrapper conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TypedItemWrapperConverter] ${errorMessage}`);
      
      return {
        success: false,
        error: new Error(errorMessage),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper for an item document
   */
  private createItemWrapper(itemDoc: ItemDocument): IContentFileWrapper {
    // Determine category based on item type and properties
    const category = this.determineItemCategory(itemDoc);
    
    // Extract tags based on item properties
    const tags = this.extractItemTags(itemDoc);
    
    return {
      entry: {
        name: itemDoc.name,
        type: 'item',
        imageId: itemDoc.imageId,
        category,
        tags,
        sortOrder: this.calculateSortOrder(itemDoc)
      },
      content: itemDoc
    };
  }

  /**
   * Determine item category for wrapper based on item type and properties
   */
  private determineItemCategory(itemDoc: ItemDocument): string {
    const pluginData = itemDoc.pluginData;
    
    switch (pluginData.itemType) {
      case 'weapon':
        if (pluginData.magical) {
          return 'Magic Weapons';
        }
        return pluginData.category === 'martial' ? 'Martial Weapons' : 'Simple Weapons';
        
      case 'armor':
        if (pluginData.magical) {
          return 'Magic Armor';
        }
        switch (pluginData.type) {
          case 'light': return 'Light Armor';
          case 'medium': return 'Medium Armor'; 
          case 'heavy': return 'Heavy Armor';
          case 'shield': return 'Shields';
          default: return 'Armor';
        }
        
      case 'tool':
        switch (pluginData.category) {
          case 'artisan': return 'Artisan Tools';
          case 'gaming-set': return 'Gaming Sets';
          case 'musical-instrument': return 'Musical Instruments';
          default: return 'Tools';
        }
        
      case 'gear':
        if (pluginData.magical) {
          return 'Wondrous Items';
        }
        switch (pluginData.category) {
          case 'consumable': return 'Consumables';
          case 'ammunition': return 'Ammunition';
          case 'treasure': return 'Treasure';
          case 'container': return 'Containers';
          default: return 'Adventuring Gear';
        }
        
      default:
        return 'Items';
    }
  }

  /**
   * Extract tags from item document
   */
  private extractItemTags(itemDoc: ItemDocument): string[] {
    const tags: string[] = [];
    const pluginData = itemDoc.pluginData;
    
    // Add item type tag
    tags.push(pluginData.itemType);
    
    // Add source tag if available
    if (pluginData.source) {
      tags.push(pluginData.source.toLowerCase());
    }
    
    // Add rarity tag for magic items
    if (pluginData.rarity) {
      tags.push(pluginData.rarity);
    }
    
    // Add magical tag
    if (pluginData.magical) {
      tags.push('magical');
    }
    
    // Add attunement tag
    if (pluginData.attunement) {
      tags.push('attunement');
    }
    
    // Add specific tags based on item type
    switch (pluginData.itemType) {
      case 'weapon':
        tags.push(pluginData.category); // simple/martial
        if (pluginData.mastery) {
          tags.push('mastery', pluginData.mastery);
        }
        if (pluginData.properties) {
          tags.push(...pluginData.properties);
        }
        break;
        
      case 'armor':
        tags.push(pluginData.type); // light/medium/heavy/shield
        if (pluginData.stealthDisadvantage) {
          tags.push('stealth-disadvantage');
        }
        break;
        
      case 'tool':
        if (pluginData.category) {
          tags.push(pluginData.category);
        }
        break;
        
      case 'gear':
        if (pluginData.category) {
          tags.push(pluginData.category);
        }
        if (pluginData.consumable) {
          tags.push('consumable');
        }
        break;
    }
    
    return tags;
  }

  /**
   * Calculate sort order for item based on type, rarity, and name
   */
  private calculateSortOrder(itemDoc: ItemDocument): number {
    const pluginData = itemDoc.pluginData;
    let baseSortOrder = 0;
    
    // Primary sort by item type
    switch (pluginData.itemType) {
      case 'weapon':
        baseSortOrder = 1000;
        // Sub-sort by category
        if (pluginData.category === 'martial') baseSortOrder += 100;
        break;
      case 'armor':
        baseSortOrder = 2000;
        // Sub-sort by armor type
        switch (pluginData.type) {
          case 'light': baseSortOrder += 100; break;
          case 'medium': baseSortOrder += 200; break;
          case 'heavy': baseSortOrder += 300; break;
          case 'shield': baseSortOrder += 400; break;
        }
        break;
      case 'tool':
        baseSortOrder = 3000;
        break;
      case 'gear':
        baseSortOrder = 4000;
        break;
    }
    
    // Secondary sort by rarity for magic items
    if (pluginData.magical && pluginData.rarity) {
      const rarityOrder: Record<string, number> = {
        'common': 10,
        'uncommon': 20,
        'rare': 30,
        'very-rare': 40,
        'legendary': 50,
        'artifact': 60
      };
      baseSortOrder += rarityOrder[pluginData.rarity] || 0;
    }
    
    // Tertiary sort by alphabetical order (simplified)
    const nameOffset = Math.min(itemDoc.name.charCodeAt(0) - 65, 25); // A=0, B=1, etc., capped at Z
    return baseSortOrder + nameOffset;
  }
}
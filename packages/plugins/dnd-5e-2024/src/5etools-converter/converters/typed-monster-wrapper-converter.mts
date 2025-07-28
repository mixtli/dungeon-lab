/**
 * Type-safe monster wrapper converter
 * 
 * Bridges the enhanced typed monster pipeline with the existing wrapper system
 * for compendium generation. Handles creature documents (monsters and NPCs)
 * and provides complete validation while maintaining compatibility with the current
 * compendium format.
 */

import { TypedMonsterConverter } from '../pipeline/typed-monster-converter.mjs';
import type { WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import type { ConversionOptions } from '../pipeline/typed-converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';
import type { CreatureDocument } from '../validation/typed-document-validators.mjs';

/**
 * Wrapper converter that bridges typed monster converter with compendium format
 */
export class TypedMonsterWrapperConverter {
  private readonly typedConverter: TypedMonsterConverter;

  constructor(options: ConversionOptions = {}) {
    this.typedConverter = new TypedMonsterConverter(options);
  }

  /**
   * Convert all monsters using the typed pipeline
   */
  async convert(): Promise<WrapperConversionResult> {
    try {
      console.log('[TypedMonsterWrapperConverter] Starting monster conversion...');
      const result = await this.typedConverter.convertMonsters();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: { total: result.stats.total, converted: 0, skipped: 0, errors: result.stats.errors }
        };
      }

      const wrapperContent: WrapperContent[] = [];
      
      // Convert each monster document to wrapper format
      for (const monsterDoc of result.results) {
        const wrapper = this.createMonsterWrapper(monsterDoc);
        wrapperContent.push({ type: 'actor', wrapper });
      }

      console.log(`[TypedMonsterWrapperConverter] Converted ${result.results.length} monsters`);
      
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
      const errorMessage = `Monster wrapper conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TypedMonsterWrapperConverter] ${errorMessage}`);
      
      return {
        success: false,
        error: new Error(errorMessage),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper for a monster document
   */
  private createMonsterWrapper(monsterDoc: CreatureDocument): IContentFileWrapper {
    // Determine category based on monster type and challenge rating
    const category = this.determineMonsterCategory(monsterDoc);
    
    // Extract tags based on monster properties
    const tags = this.extractMonsterTags(monsterDoc);
    
    return {
      entry: {
        name: monsterDoc.name,
        type: 'actor',
        imageId: monsterDoc.imageId,
        category,
        tags,
        sortOrder: this.calculateSortOrder(monsterDoc)
      },
      content: monsterDoc
    };
  }

  /**
   * Determine monster category for wrapper based on type and CR
   */
  private determineMonsterCategory(monsterDoc: CreatureDocument): string {
    const pluginData = monsterDoc.pluginData;
    const cr = typeof pluginData.challengeRating === 'number' ? pluginData.challengeRating : parseFloat(String(pluginData.challengeRating)) || 0;
    
    // Categorize by creature type first
    const type = pluginData.type?.toLowerCase() || 'humanoid';
    
    switch (type) {
      case 'humanoid':
        // Distinguish between NPCs and monsters
        if (cr <= 2) {
          return 'NPCs';
        }
        return 'Humanoids';
        
      case 'dragon':
        return 'Dragons';
        
      case 'fiend':
        return 'Fiends';
        
      case 'celestial':
        return 'Celestials';
        
      case 'fey':
        return 'Fey';
        
      case 'elemental':
        return 'Elementals';
        
      case 'aberration':
        return 'Aberrations';
        
      case 'undead':
        return 'Undead';
        
      case 'construct':
        return 'Constructs';
        
      case 'giant':
        return 'Giants';
        
      case 'monstrosity':
        return 'Monstrosities';
        
      case 'ooze':
        return 'Oozes';
        
      case 'plant':
        return 'Plants';
        
      case 'beast':
        if (cr <= 1) {
          return 'Beasts (Low CR)';
        }
        return 'Beasts';
        
      default:
        return 'Miscellaneous';
    }
  }

  /**
   * Extract tags from monster document
   */
  private extractMonsterTags(monsterDoc: CreatureDocument): string[] {
    const tags: string[] = [];
    const pluginData = monsterDoc.pluginData;
    
    // Add creature type tag
    if (pluginData.type) {
      tags.push(pluginData.type.toLowerCase());
    }
    
    // Add size tag
    if (pluginData.size) {
      tags.push(pluginData.size);
    }
    
    // Add source tag if available
    if (pluginData.source) {
      tags.push(pluginData.source.toLowerCase());
    }
    
    // Add challenge rating category
    const cr = typeof pluginData.challengeRating === 'number' ? pluginData.challengeRating : parseFloat(String(pluginData.challengeRating)) || 0;
    if (cr >= 10) {
      tags.push('high-cr');
    } else if (cr >= 5) {
      tags.push('medium-cr');
    } else if (cr >= 1) {
      tags.push('low-cr');
    } else {
      tags.push('very-low-cr');
    }
    
    // Add special ability tags
    if (pluginData.spellcasting) {
      tags.push('spellcaster');
    }
    
    if (pluginData.legendaryActions?.length) {
      tags.push('legendary');
    }
    
    // Add environment tags
    if (pluginData.environment?.length) {
      tags.push(...pluginData.environment.map(env => env.toLowerCase()));
    }
    
    // Add alignment category
    const alignment = pluginData.alignment?.toLowerCase() || '';
    if (alignment.includes('evil')) {
      tags.push('evil');
    } else if (alignment.includes('good')) {
      tags.push('good');
    } else if (alignment.includes('neutral')) {
      tags.push('neutral');
    }
    
    // Add damage resistance/immunity tags
    if (pluginData.damageResistances?.length) {
      tags.push('damage-resistant');
    }
    
    if (pluginData.damageImmunities?.length) {
      tags.push('damage-immune');
    }
    
    if (pluginData.conditionImmunities?.length) {
      tags.push('condition-immune');
    }
    
    return tags;
  }

  /**
   * Calculate sort order for monster based on type, CR, and name
   */
  private calculateSortOrder(monsterDoc: CreatureDocument): number {
    const pluginData = monsterDoc.pluginData;
    let baseSortOrder = 0;
    
    // Primary sort by creature type
    const type = pluginData.type?.toLowerCase() || 'humanoid';
    const typeOrder: Record<string, number> = {
      'humanoid': 1000,
      'beast': 2000,
      'fey': 3000,
      'dragon': 4000,
      'elemental': 5000,
      'giant': 6000,
      'monstrosity': 7000,
      'fiend': 8000,
      'celestial': 9000,
      'undead': 10000,
      'aberration': 11000,
      'construct': 12000,
      'ooze': 13000,
      'plant': 14000
    };
    
    baseSortOrder = typeOrder[type] || 15000;
    
    // Secondary sort by challenge rating (scaled to hundreds)
    const cr = typeof pluginData.challengeRating === 'number' ? pluginData.challengeRating : parseFloat(String(pluginData.challengeRating)) || 0;
    baseSortOrder += Math.floor(cr * 100);
    
    // Tertiary sort by alphabetical order (simplified)
    const nameOffset = Math.min(monsterDoc.name.charCodeAt(0) - 65, 25); // A=0, B=1, etc., capped at Z
    return baseSortOrder + nameOffset;
  }
}
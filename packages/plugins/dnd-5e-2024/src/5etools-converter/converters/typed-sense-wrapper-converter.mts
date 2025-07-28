/**
 * Type-safe sense wrapper converter
 * 
 * Bridges the enhanced typed sense pipeline with the existing wrapper system
 * for compendium generation. Handles sense documents and provides complete
 * validation while maintaining compatibility with the current compendium format.
 */

import { TypedSenseConverter } from '../pipeline/typed-sense-converter.mjs';
import type { SenseDocument } from '../validation/typed-document-validators.mjs';
import type { WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import type { ConversionOptions } from '../pipeline/typed-converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Wrapper converter that bridges typed sense converter with compendium format
 */
export class TypedSenseWrapperConverter {
  private readonly typedConverter: TypedSenseConverter;

  constructor(options: ConversionOptions = {}) {
    this.typedConverter = new TypedSenseConverter(options);
  }

  /**
   * Convert all senses using the typed pipeline
   */
  async convert(): Promise<WrapperConversionResult> {
    try {
      console.log('[TypedSenseWrapperConverter] Starting sense conversion...');
      const result = await this.typedConverter.convertSenses();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: { total: result.stats.total, converted: 0, skipped: 0, errors: result.stats.errors }
        };
      }

      const wrapperContent: WrapperContent[] = [];
      
      // Convert each sense document to wrapper format
      for (const senseDoc of result.results) {
        const wrapper = this.createSenseWrapper(senseDoc);
        wrapperContent.push({ type: 'vtt-document', wrapper });
      }

      console.log(`[TypedSenseWrapperConverter] Converted ${result.results.length} senses`);
      
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
      const errorMessage = `Sense wrapper conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TypedSenseWrapperConverter] ${errorMessage}`);
      
      return {
        success: false,
        error: new Error(errorMessage),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper for a sense document
   */
  private createSenseWrapper(senseDoc: SenseDocument): IContentFileWrapper {
    // Determine category based on sense type and properties
    const category = this.determineSenseCategory(senseDoc);
    
    // Extract tags based on sense properties
    const tags = this.extractSenseTags(senseDoc);
    
    return {
      entry: {
        name: senseDoc.name,
        type: 'vtt-document',
        imageId: senseDoc.imageId,
        category,
        tags,
        sortOrder: this.calculateSortOrder(senseDoc)
      },
      content: senseDoc
    };
  }

  /**
   * Determine sense category for wrapper based on type and mechanics
   */
  private determineSenseCategory(senseDoc: SenseDocument): string {
    const pluginData = senseDoc.pluginData;
    const name = pluginData.name.toLowerCase();
    
    // Categorize by sense type
    if (name.includes('darkvision')) {
      return 'Vision';
    }
    
    if (name.includes('blindsight')) {
      return 'Special Vision';
    }
    
    if (name.includes('truesight')) {
      return 'Magical Senses';
    }
    
    if (name.includes('tremorsense')) {
      return 'Vibration Senses';
    }
    
    if (name.includes('telepathy') || name.includes('detect thoughts')) {
      return 'Mental Senses';
    }
    
    if (name.includes('detect')) {
      return 'Detection Abilities';
    }
    
    if (name.includes('scent') || name.includes('smell')) {
      return 'Chemical Senses';
    }
    
    // Check if it's magical
    if (pluginData.acquisition?.magicalMeans || pluginData.acquisition?.spells?.length) {
      return 'Magical Senses';
    }
    
    // Default category
    return 'Physical Senses';
  }

  /**
   * Extract tags from sense document
   */
  private extractSenseTags(senseDoc: SenseDocument): string[] {
    const tags: string[] = [];
    const pluginData = senseDoc.pluginData;
    const name = pluginData.name.toLowerCase();
    
    // Add sense type tags
    if (name.includes('darkvision')) {
      tags.push('darkvision', 'vision');
    }
    
    if (name.includes('blindsight')) {
      tags.push('blindsight', 'special-vision');
    }
    
    if (name.includes('truesight')) {
      tags.push('truesight', 'magical', 'ultimate-vision');
    }
    
    if (name.includes('tremorsense')) {
      tags.push('tremorsense', 'vibration');
    }
    
    if (name.includes('telepathy')) {
      tags.push('telepathy', 'mental', 'communication');
    }
    
    // Add source tag if available
    if (pluginData.source) {
      tags.push(pluginData.source.toLowerCase());
    }
    
    // Add mechanics-based tags
    if (pluginData.mechanics?.worksInDarkness) {
      tags.push('works-in-darkness');
    }
    
    if (pluginData.mechanics?.detectsInvisible) {
      tags.push('detects-invisible');
    }
    
    if (pluginData.mechanics?.defaultRange) {
      const range = pluginData.mechanics.defaultRange;
      if (range <= 30) {
        tags.push('short-range');
      } else if (range <= 60) {
        tags.push('medium-range');
      } else {
        tags.push('long-range');
      }
    }
    
    // Add acquisition method tags
    if (pluginData.acquisition?.magicalMeans) {
      tags.push('magical');
    }
    
    if (pluginData.acquisition?.naturalSpecies?.length) {
      tags.push('natural');
    }
    
    if (pluginData.acquisition?.magicalItems) {
      tags.push('item-granted');
    }
    
    // Add detection capability tags
    if (pluginData.mechanics?.detects?.includes('magic')) {
      tags.push('detects-magic');
    }
    
    if (pluginData.mechanics?.detects?.includes('undead')) {
      tags.push('detects-undead');
    }
    
    if (pluginData.mechanics?.detects?.includes('thoughts')) {
      tags.push('detects-thoughts');
    }
    
    // Add game impact tags
    if (pluginData.gameImpact?.combatAdvantages?.length) {
      tags.push('combat-advantage');
    }
    
    if (pluginData.gameImpact?.explorationBenefits?.length) {
      tags.push('exploration-utility');
    }
    
    return tags;
  }

  /**
   * Calculate sort order for sense based on type, range, and name
   */
  private calculateSortOrder(senseDoc: SenseDocument): number {
    const pluginData = senseDoc.pluginData;
    let baseSortOrder = 0;
    const name = pluginData.name.toLowerCase();
    
    // Primary sort by sense type (more common senses first)
    if (name.includes('darkvision')) {
      baseSortOrder = 1000;
    } else if (name.includes('blindsight')) {
      baseSortOrder = 2000;
    } else if (name.includes('tremorsense')) {
      baseSortOrder = 3000;
    } else if (name.includes('truesight')) {
      baseSortOrder = 4000;
    } else if (name.includes('detect')) {
      baseSortOrder = 5000;
    } else if (name.includes('telepathy')) {
      baseSortOrder = 6000;
    } else {
      baseSortOrder = 7000;
    }
    
    // Secondary sort by range (shorter ranges first within each type)
    if (pluginData.mechanics?.defaultRange) {
      baseSortOrder += pluginData.mechanics.defaultRange;
    }
    
    // Tertiary sort by alphabetical order (simplified)
    const nameOffset = Math.min(pluginData.name.charCodeAt(0) - 65, 25); // A=0, B=1, etc., capped at Z
    return baseSortOrder + nameOffset;
  }
}
/**
 * Type-safe feat wrapper converter
 * 
 * Bridges the enhanced typed feat pipeline with the existing wrapper system
 * for compendium generation. Provides complete validation while maintaining
 * compatibility with the current compendium format.
 */

import { TypedFeatConverter } from '../pipeline/typed-feat-converter.mjs';
import type { WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import type { ConversionOptions } from '../pipeline/typed-converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';
import type { FeatDocument } from '../validation/typed-document-validators.mjs';

/**
 * Wrapper converter that bridges typed feat converter with compendium format
 */
export class TypedFeatWrapperConverter {
  private readonly typedConverter: TypedFeatConverter;

  constructor(options: ConversionOptions = {}) {
    this.typedConverter = new TypedFeatConverter(options);
  }

  /**
   * Convert all feats using the typed pipeline
   */
  async convert(): Promise<WrapperConversionResult> {
    try {
      console.log('[TypedFeatWrapperConverter] Starting feat conversion...');
      const result = await this.typedConverter.convertFeats();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: { total: result.stats.total, converted: 0, skipped: 0, errors: result.stats.errors }
        };
      }

      const wrapperContent: WrapperContent[] = [];
      
      // Convert each feat document to wrapper format
      for (const featDoc of result.results) {
        const wrapper = this.createFeatWrapper(featDoc);
        wrapperContent.push({ type: 'vtt-document', wrapper });
      }

      console.log(`[TypedFeatWrapperConverter] Converted ${result.results.length} feats`);
      
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
      const errorMessage = `Feat wrapper conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TypedFeatWrapperConverter] ${errorMessage}`);
      
      return {
        success: false,
        error: new Error(errorMessage),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper for a feat document
   */
  private createFeatWrapper(featDoc: FeatDocument): IContentFileWrapper {
    // Determine category based on feat type
    const category = this.determineFeatCategory(featDoc);
    
    // Extract tags based on feat properties
    const tags = this.extractFeatTags(featDoc);
    
    return {
      entry: {
        name: featDoc.name,
        type: 'vtt-document',
        imageId: featDoc.imageId,
        category,
        tags,
        sortOrder: this.calculateSortOrder(featDoc)
      },
      content: featDoc
    };
  }

  /**
   * Determine feat category for wrapper
   */
  private determineFeatCategory(featDoc: FeatDocument): string {
    const pluginData = featDoc.pluginData;
    
    switch (pluginData.category) {
      case 'origin':
        return 'Origin Feats';
      case 'general':
        return 'General Feats';
      case 'fighting_style':
        return 'Fighting Style Feats';
      case 'epic_boon':
        return 'Epic Boon Feats';
      default:
        return 'Feats';
    }
  }

  /**
   * Extract tags from feat document
   */
  private extractFeatTags(featDoc: FeatDocument): string[] {
    const tags: string[] = [];
    const pluginData = featDoc.pluginData;
    
    // Add category tag
    tags.push(pluginData.category);
    
    // Add source tag if available
    if (pluginData.source) {
      tags.push(pluginData.source.toLowerCase());
    }
    
    // Add additional tags based on feat type
    if (pluginData.category === 'general' && pluginData.repeatable) {
      tags.push('repeatable');
    }
    
    if (pluginData.category === 'epic_boon') {
      tags.push('epic');
    }
    
    return tags;
  }

  /**
   * Calculate sort order for feat
   */
  private calculateSortOrder(featDoc: FeatDocument): number {
    const pluginData = featDoc.pluginData;
    
    // Sort by category first, then alphabetically
    let baseSortOrder = 0;
    
    switch (pluginData.category) {
      case 'origin':
        baseSortOrder = 1000;
        break;
      case 'general':
        baseSortOrder = 2000;
        break;
      case 'fighting_style':
        baseSortOrder = 3000;
        break;
      case 'epic_boon':
        baseSortOrder = 4000;
        break;
    }
    
    // Add alphabetical offset (simplified)
    const nameOffset = featDoc.name.charCodeAt(0) - 65; // A=0, B=1, etc.
    return baseSortOrder + nameOffset;
  }
}
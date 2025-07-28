/**
 * Wrapper for TypedClassConverter to integrate with compendium generation
 * 
 * This adapter bridges the new typed pipeline with the existing compendium format,
 * providing backward compatibility while using the improved type-safe converter.
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { TypedClassConverter } from '../pipeline/typed-class-converter.mjs';
import type { ClassDocument } from '../validation/typed-document-validators.mjs';

/**
 * Wrapper converter that uses TypedClassConverter internally
 */
export class TypedClassWrapperConverter extends WrapperConverter {
  private typedConverter: TypedClassConverter;

  constructor(options = {}) {
    super(options);
    
    // Initialize the typed converter with compatible options
    this.typedConverter = new TypedClassConverter({
      srdOnly: this.options.srdOnly,
      includeAssets: this.options.includeAssets,
      textProcessing: {
        cleanText: true,
        extractReferences: true
      }
    });
  }

  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting typed class wrapper conversion...');

      // Use the typed converter to get validated documents
      const conversionResult = await this.typedConverter.convertClasses();
      
      if (!conversionResult.success) {
        return {
          success: false,
          error: new Error('Typed class conversion failed')
        };
      }

      // Transform typed documents to wrapper format
      const content: WrapperContent[] = [];
      let index = 0;

      for (const document of conversionResult.results) {
        try {
          // Create wrapper using the document data
          const wrapper = this.createWrapper(
            document.name,
            document, // Full document structure
            'vtt-document', // Document type
            {
              imageId: this.extractAssetPath(document),
              category: this.determineCategory(),
              tags: this.createTagsForDocument(document),
              sortOrder: this.calculateSortOrderForDocument(document, index)
            }
          );

          content.push({
            type: 'vtt-document',
            wrapper,
            originalPath: `class/${document.name.toLowerCase()}`
          });

          index++;
        } catch (error) {
          this.log(`❌ Failed to create wrapper for ${document.name}:`, error);
        }
      }

      this.log(`Typed class wrapper conversion complete. Generated ${content.length} wrappers from ${conversionResult.results.length} documents.`);

      return {
        success: true,
        content,
        stats: {
          total: conversionResult.stats.total,
          converted: content.length,
          skipped: 0,
          errors: conversionResult.stats.errors
        }
      };

    } catch (error) {
      this.log('Typed class wrapper conversion failed:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private extractAssetPath(document: ClassDocument): string | undefined {
    // Asset path would be stored in the document if available
    return undefined; // TypedClassConverter doesn't currently expose asset paths
  }

  private determineCategory(): string {
    return 'Classes';
  }

  private createTagsForDocument(document: ClassDocument): string[] {
    const tags: string[] = [];
    
    // Add source tag
    if (document.pluginData.source) {
      tags.push(document.pluginData.source);
    }
    
    // Add primary ability tags
    if (document.pluginData.primaryAbilities?.length) {
      tags.push(...document.pluginData.primaryAbilities);
    }
    
    // Add spellcasting tag if applicable
    if (document.pluginData.spellcasting) {
      tags.push('spellcaster');
      tags.push(document.pluginData.spellcasting.type);
    }
    
    // Add weapon mastery tag if applicable
    if (document.pluginData.weaponMastery) {
      tags.push('weapon-mastery');
    }
    
    return tags;
  }

  private calculateSortOrderForDocument(document: ClassDocument, index: number): number {
    // Base sort order for classes
    const baseOrder = 3000;
    
    // Sort alphabetically by name
    const nameOrder = document.name.toLowerCase().charCodeAt(0) - 97; // a=0, b=1, etc.
    
    return baseOrder + nameOrder + index;
  }
}
/**
 * Wrapper for TypedSpeciesConverter to integrate with compendium generation
 * 
 * This adapter bridges the new typed pipeline with the existing compendium format,
 * providing backward compatibility while using the improved type-safe converter.
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { TypedSpeciesConverter } from '../pipeline/typed-species-converter.mjs';
import type { SpeciesDocument } from '../validation/typed-document-validators.mjs';

/**
 * Wrapper converter that uses TypedSpeciesConverter internally
 */
export class TypedSpeciesWrapperConverter extends WrapperConverter {
  private typedConverter: TypedSpeciesConverter;

  constructor(options = {}) {
    super(options);
    
    // Initialize the typed converter with compatible options
    this.typedConverter = new TypedSpeciesConverter({
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
      this.log('Starting typed species wrapper conversion...');

      // Use the typed converter to get validated documents
      const conversionResult = await this.typedConverter.convertSpecies();
      
      if (!conversionResult.success) {
        return {
          success: false,
          error: new Error('Typed species conversion failed')
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
            originalPath: `races/${document.name.toLowerCase()}`
          });

          index++;
        } catch (error) {
          this.log(`❌ Failed to create wrapper for ${document.name}:`, error);
        }
      }

      this.log(`Typed species wrapper conversion complete. Generated ${content.length} wrappers from ${conversionResult.results.length} documents.`);

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
      this.log('Typed species wrapper conversion failed:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private extractAssetPath(document: SpeciesDocument): string | undefined {
    // Asset path would be stored in the document if available
    return undefined; // TypedSpeciesConverter doesn't currently expose asset paths
  }

  private determineCategory(): string {
    return 'Species';
  }

  private createTagsForDocument(document: SpeciesDocument): string[] {
    const tags: string[] = [];
    
    // Add source tag
    if (document.pluginData.source) {
      tags.push(document.pluginData.source);
    }
    
    // Add size tag
    if (document.pluginData.size) {
      tags.push(document.pluginData.size);
    }
    
    // Add creature type tag
    if (document.pluginData.creatureType) {
      tags.push(document.pluginData.creatureType.toLowerCase());
    }
    
    // Add movement tags
    if (document.pluginData.speed?.fly) {
      tags.push('flying');
    }
    if (document.pluginData.speed?.swim) {
      tags.push('swimming');
    }
    if (document.pluginData.speed?.climb) {
      tags.push('climbing');
    }
    
    // Add sense tags
    if (document.pluginData.senses?.darkvision) {
      tags.push('darkvision');
    }
    
    // Add subrace tags
    if (document.pluginData.subraces?.length) {
      tags.push('subraces');
    }
    
    return tags;
  }

  private calculateSortOrderForDocument(document: SpeciesDocument, index: number): number {
    // Base sort order for species
    const baseOrder = 4000;
    
    // Sort alphabetically by name
    const nameOrder = document.name.toLowerCase().charCodeAt(0) - 97; // a=0, b=1, etc.
    
    return baseOrder + nameOrder + index;
  }
}
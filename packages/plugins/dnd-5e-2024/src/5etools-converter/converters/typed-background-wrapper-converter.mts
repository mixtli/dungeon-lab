/**
 * Wrapper for TypedBackgroundConverter to integrate with compendium generation
 * 
 * This adapter bridges the new typed pipeline with the existing compendium format,
 * providing backward compatibility while using the improved type-safe converter.
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { TypedBackgroundConverter } from '../pipeline/typed-background-converter.mjs';
import type { BackgroundDocument } from '../validation/typed-document-validators.mjs';

/**
 * Wrapper converter that uses TypedBackgroundConverter internally
 */
export class TypedBackgroundWrapperConverter extends WrapperConverter {
  private typedConverter: TypedBackgroundConverter;

  constructor(options = {}) {
    super(options);
    
    // Initialize the typed converter with compatible options
    this.typedConverter = new TypedBackgroundConverter({
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
      this.log('Starting typed background wrapper conversion...');
      
      // Use the typed converter to get validated documents
      const result = await this.typedConverter.convertBackgrounds();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: {
            total: result.stats.total,
            converted: 0,
            skipped: 0,
            errors: result.stats.errors
          }
        };
      }

      // Convert the typed documents to wrapper format
      const wrapperContent: WrapperContent[] = [];
      let converted = 0;

      for (const backgroundDoc of result.results) {
        try {
          const wrapper = this.createBackgroundWrapper(backgroundDoc);
          wrapperContent.push({
            type: 'vtt-document',
            wrapper
          });
          converted++;
          
          this.log(`✅ Background ${backgroundDoc.name} wrapped successfully`);
        } catch (error) {
          this.log(`❌ Failed to wrap background ${backgroundDoc.name}:`, error);
        }
      }

      this.log(`Typed background wrapper conversion complete. ${converted}/${result.results.length} wrapped`);

      return {
        success: true,
        content: wrapperContent,
        stats: {
          total: result.stats.total,
          converted,
          skipped: result.stats.total - result.stats.converted,
          errors: result.stats.errors + (result.results.length - converted)
        }
      };

    } catch (error) {
      this.log('❌ Typed background wrapper conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper format from a typed background document
   */
  private createBackgroundWrapper(backgroundDoc: BackgroundDocument) {
    // The typed converter already sets imageId on the document if available
    const imageId = (backgroundDoc as any).imageId;
    const category = 'Backgrounds'; // Fixed category for backgrounds
    const tags: string[] = []; // Could add background-specific tags
    const sortOrder = 0; // Default sort order

    // Create the wrapper using the base class method
    return this.createWrapper(
      backgroundDoc.name,
      backgroundDoc, // The full typed document becomes the content
      'vtt-document',
      {
        imageId,
        category,
        tags,
        sortOrder
      }
    );
  }

  /**
   * Override base logging to include typed converter context
   */
  protected log(message: string, ...args: unknown[]): void {
    if (process.env.VERBOSE || process.env.DEBUG) {
      console.log(`[TypedBackgroundWrapperConverter] ${message}`, ...args);
    }
  }
}
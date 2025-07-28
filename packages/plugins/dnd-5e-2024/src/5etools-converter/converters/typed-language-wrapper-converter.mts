/**
 * Wrapper for TypedLanguageConverter to integrate with compendium generation
 * 
 * This adapter bridges the new typed pipeline with the existing compendium format,
 * providing backward compatibility while using the improved type-safe converter.
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { TypedLanguageConverter, type LanguageDocument } from '../pipeline/typed-language-converter.mjs';

/**
 * Wrapper converter that uses TypedLanguageConverter internally
 */
export class TypedLanguageWrapperConverter extends WrapperConverter {
  private typedConverter: TypedLanguageConverter;

  constructor(options = {}) {
    super(options);
    
    // Initialize the typed converter with compatible options
    this.typedConverter = new TypedLanguageConverter({
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
      this.log('Starting typed language wrapper conversion...');
      
      // Use the typed converter to get validated documents
      const result = await this.typedConverter.convertLanguages();
      
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

      for (const languageDoc of result.results) {
        try {
          const wrapper = this.createLanguageWrapper(languageDoc);
          wrapperContent.push({
            type: 'vtt-document',
            wrapper
          });
          converted++;
          
          this.log(`✅ Language ${languageDoc.name} wrapped successfully`);
        } catch (error) {
          this.log(`❌ Failed to wrap language ${languageDoc.name}:`, error);
        }
      }

      this.log(`Typed language wrapper conversion complete. ${converted}/${result.results.length} wrapped`);

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
      this.log('❌ Typed language wrapper conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper format from a typed language document
   */
  private createLanguageWrapper(languageDoc: LanguageDocument) {
    // The typed converter already sets imageId on the document if available
    const imageId = (languageDoc as any).imageId;
    const category = 'Languages'; // Fixed category for languages
    const tags: string[] = [
      languageDoc.pluginData.category, // 'standard' or 'rare'
      languageDoc.pluginData.script.name // Script name as tag
    ].filter(Boolean);
    const sortOrder = 0; // Default sort order

    // Create the wrapper using the base class method
    return this.createWrapper(
      languageDoc.name,
      languageDoc, // The full typed document becomes the content
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
      console.log(`[TypedLanguageWrapperConverter] ${message}`, ...args);
    }
  }
}
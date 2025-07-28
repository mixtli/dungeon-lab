/**
 * Wrapper for TypedSpellConverter to integrate with compendium generation
 * 
 * This adapter bridges the new typed pipeline with the existing compendium format,
 * providing backward compatibility while using the improved type-safe converter.
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { TypedSpellConverter } from '../pipeline/typed-spell-converter.mjs';
import type { SpellDocument } from '../validation/typed-document-validators.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';

/**
 * Wrapper converter that uses TypedSpellConverter internally
 */
export class TypedSpellWrapperConverter extends WrapperConverter {
  private typedConverter: TypedSpellConverter;

  constructor(options = {}) {
    super(options);
    
    // Initialize the typed converter with compatible options
    this.typedConverter = new TypedSpellConverter({
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
      this.log('Starting typed spell wrapper conversion...');
      
      // Use the typed converter to get validated documents
      const result = await this.typedConverter.convertSpells();
      
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

      for (const spellDoc of result.results) {
        try {
          const wrapper = this.createSpellWrapper(spellDoc);
          wrapperContent.push({
            type: 'vtt-document',
            wrapper
          });
          converted++;
          
          this.log(`✅ Spell ${spellDoc.name} wrapped successfully`);
        } catch (error) {
          this.log(`❌ Failed to wrap spell ${spellDoc.name}:`, error);
        }
      }

      this.log(`Typed spell wrapper conversion complete. ${converted}/${result.results.length} wrapped`);

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
      this.log('❌ Typed spell wrapper conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper format from a typed spell document
   */
  private createSpellWrapper(spellDoc: SpellDocument) {
    // The typed converter already sets imageId on the document if available
    const imageId = (spellDoc as any).imageId;
    const category = 'Spells'; // Fixed category for spells
    const tags: string[] = []; // Could add spell school, level, etc. as tags
    const sortOrder = 0; // Default sort order

    // Create the wrapper using the base class method
    return this.createWrapper(
      spellDoc.name,
      spellDoc, // The full typed document becomes the content
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
      console.log(`[TypedSpellWrapperConverter] ${message}`, ...args);
    }
  }
}
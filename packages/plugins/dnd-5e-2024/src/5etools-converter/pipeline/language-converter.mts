/**
 * Type-safe language converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Fluff data support for enhanced descriptions and images
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type LanguageDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsLanguage, EtoolsLanguageData } from '../../5etools-types/languages.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndLanguageDataSchema, type DndLanguageData } from '../../types/dnd/language.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

/**
 * Input schema for 5etools language data
 */
const etoolsLanguageSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  type: z.string().optional(), // "standard", "exotic", etc.
  typicalSpeakers: z.array(z.string()).optional(),
  script: z.string().optional(),
  entries: z.array(z.unknown()).optional(), // EtoolsEntry has complex structure
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  reprintedAs: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties

/**
 * Language fluff data interface
 */
interface EtoolsLanguageFluff {
  name: string;
  source?: string;
  entries?: EtoolsEntry[];
  images?: Array<{
    type: string;
    href: {
      type: string;
      path: string;
    };
  }>;
}

/**
 * Language fluff data file structure
 */
interface EtoolsLanguageFluffData {
  languageFluff?: EtoolsLanguageFluff[];
}


/**
 * Typed language converter using the new pipeline
 */
export class TypedLanguageConverter extends TypedConverter<
  typeof etoolsLanguageSchema,
  typeof dndLanguageDataSchema,
  LanguageDocument
> {
  private fluffMap = new Map<string, EtoolsLanguageFluff>();

  protected getInputSchema() {
    return etoolsLanguageSchema;
  }

  protected getOutputSchema() {
    return dndLanguageDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'language';
  }

  protected extractDescription(input: z.infer<typeof etoolsLanguageSchema>): string {
    // Check for fluff description first, then fall back to language entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    if (input.entries) {
      return processEntries(input.entries as EtoolsEntry[], this.options.textProcessing).text;
    }
    return `Language: ${input.name}`;
  }

  protected extractAssetPath(input: z.infer<typeof etoolsLanguageSchema>): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsLanguageSchema>): DndLanguageData {
    const description = this.extractDescription(input);
    const origin = this.extractOrigin(input.entries);
    
    return {
      name: input.name,
      description,
      category: this.parseCategory(input.type),
      origin,
      source: input.source,
      page: input.page
    };
  }

  /**
   * Load language fluff data for enhanced descriptions and image assets
   */
  private async loadFluffData(): Promise<void> {
    try {
      const rawFluffData = await this.readEtoolsData('fluff-languages.json');
      const fluffData = safeEtoolsCast<EtoolsLanguageFluffData>(rawFluffData, [], 'language fluff file');
      
      if (fluffData.languageFluff) {
        for (const fluff of fluffData.languageFluff) {
          this.fluffMap.set(fluff.name, fluff);
        }
        this.log(`Loaded fluff data for ${fluffData.languageFluff.length} languages`);
      }
    } catch (error) {
      this.log('Failed to load language fluff data:', error);
    }
  }

  /**
   * Convert array of languages using the new pipeline
   */
  public async convertLanguages(): Promise<{
    success: boolean;
    results: LanguageDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed language conversion...');
      
      // Load fluff data for enhanced descriptions and images
      await this.loadFluffData();
      
      const results: LanguageDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read language data using typed approach
      const rawData = await this.readEtoolsData('languages.json');
      const languageData = safeEtoolsCast<EtoolsLanguageData>(
        rawData, 
        ['language'], 
        'language data file languages.json'
      );

      // Extract and filter languages
      const languages = extractEtoolsArray<EtoolsLanguage>(
        languageData, 
        'language', 
        'language list in languages.json'
      );
      const filteredLanguages = this.filterSrdContent(languages);
      
      total = filteredLanguages.length;
      this.log(`Processing ${filteredLanguages.length} languages`);

      for (const language of filteredLanguages) {
        const result = await this.convertItem(language);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Language ${language.name} converted successfully`);
        } else {
          errors.push(`Failed to convert language ${language.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Language ${language.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
        }
      }
      
      this.log(`Typed language conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Language conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  /**
   * Private helper methods for language-specific parsing
   */

  private parseCategory(type?: string): DndLanguageData['category'] {
    // XPHB uses 'standard' and 'rare' directly
    if (type === 'rare') {
      return 'rare';
    }
    return 'standard'; // Default to standard
  }

  private extractOrigin(entries?: unknown[]): string | undefined {
    if (!entries || entries.length === 0) {
      return undefined;
    }
    
    const firstEntry = entries[0];
    if (typeof firstEntry === 'string' && firstEntry.startsWith('Origin: ')) {
      return firstEntry.replace('Origin: ', '').replace(/\.$/, '').trim();
    }
    
    return undefined;
  }

}
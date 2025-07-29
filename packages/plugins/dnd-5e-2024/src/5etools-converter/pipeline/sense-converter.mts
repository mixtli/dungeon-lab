/**
 * Type-safe sense converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Comprehensive sense data extraction with mechanics, limitations, and game impact
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type SenseDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsSenseData } from '../../5etools-types/senses.mjs';
import { etoolsSenseSchema } from '../../5etools-types/senses.mjs';
import { 
  dndSenseDataSchema, 
  type DndSenseData
} from '../../types/dnd/sense.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// SenseDocument type is now imported from the validators file

/**
 * Typed sense converter using the new pipeline
 */
export class TypedSenseConverter extends TypedConverter<
  typeof etoolsSenseSchema,
  typeof dndSenseDataSchema,
  SenseDocument
> {

  protected getInputSchema() {
    return etoolsSenseSchema;
  }

  protected getOutputSchema() {
    return dndSenseDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'sense';
  }

  protected extractDescription(input: z.infer<typeof etoolsSenseSchema>): string {
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `${input.name} is a special sense.`;
  }

  protected extractAssetPath(_input: z.infer<typeof etoolsSenseSchema>): string | undefined {
    // Senses typically don't have associated images
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsSenseSchema>): DndSenseData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page
    };
  }

  /**
   * Convert array of senses from the senses.json file
   */
  public async convertSenses(): Promise<{
    success: boolean;
    results: SenseDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed sense conversion...');
      
      const results: SenseDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Process senses.json file
      const filename = 'senses.json';
      
      try {
        const rawData = await this.readEtoolsData(filename);
        const senseData = safeEtoolsCast<EtoolsSenseData>(rawData, ['sense'], `sense data file ${filename}`);
        
        if (!senseData.sense?.length) {
          this.log(`No senses found in ${filename}`);
          return {
            success: true,
            results: [],
            errors: [],
            stats: { total: 0, converted: 0, errors: 0 }
          };
        }

        const filteredSenses = this.filterSrdContent(senseData.sense);
        total += filteredSenses.length;
        
        this.log(`Processing ${filteredSenses.length} senses from ${filename}`);

        for (const sense of filteredSenses) {
          const result = await this.convertItem(sense);
          
          if (result.success && result.document) {
            results.push(result.document);
            converted++;
            this.log(`✅ Sense ${sense.name} converted successfully`);
          } else {
            errors.push(`Failed to convert sense ${sense.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
            this.log(`❌ Sense ${sense.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
          }
        }
      } catch (fileError) {
        const errorMsg = `Failed to process ${filename}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        this.log(errorMsg);
      }
      
      this.log(`Typed sense conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Sense conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

}
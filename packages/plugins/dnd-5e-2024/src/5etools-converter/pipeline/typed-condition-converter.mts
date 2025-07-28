/**
 * Type-safe condition converter - proof of concept
 * 
 * Demonstrates the new pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 */

import { z } from 'zod';
import { TypedConverter, type ConversionOptions } from './typed-converter.mjs';
import { 
  conditionDocumentValidator,
  type ConditionDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsCondition, EtoolsConditionData } from '../../5etools-types/conditions.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndConditionDataSchema, type DndConditionData } from '../../types/dnd/condition.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

/**
 * Input schema for 5etools condition data
 */
const etoolsConditionSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  entries: z.array(z.any()), // EtoolsEntry[] - using any for now to avoid circular imports
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  otherSources: z.array(z.object({
    source: z.string(),
    page: z.number()
  })).optional(),
  reprintedAs: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties

/**
 * Condition fluff data interface
 */
interface EtoolsConditionFluff {
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
 * Condition fluff data file structure
 */
interface EtoolsConditionFluffData {
  conditionFluff?: EtoolsConditionFluff[];
}

/**
 * Typed condition converter using the new pipeline
 */
export class TypedConditionConverter extends TypedConverter<
  typeof etoolsConditionSchema,
  typeof dndConditionDataSchema,
  ConditionDocument
> {
  private fluffMap = new Map<string, EtoolsConditionFluff>();
  protected getInputSchema() {
    return etoolsConditionSchema;
  }

  protected getOutputSchema() {
    return dndConditionDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'condition';
  }

  protected extractDescription(input: EtoolsCondition): string {
    // Check for fluff description first, then fall back to condition entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    return processEntries(input.entries, this.options.textProcessing).text;
  }

  protected extractAssetPath(input: EtoolsCondition): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: EtoolsCondition): DndConditionData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page,
      effects: this.parseConditionEffectsAsObject(input.entries, description),
      duration: this.parseConditionDuration(description)
    };
  }

  /**
   * Load condition fluff data for image assets and enhanced descriptions
   */
  private async loadFluffData(): Promise<void> {
    try {
      const rawFluffData = await this.readEtoolsData('fluff-conditionsdiseases.json');
      const fluffData = safeEtoolsCast<EtoolsConditionFluffData>(rawFluffData, [], 'condition fluff file');
      
      if (fluffData.conditionFluff) {
        for (const fluff of fluffData.conditionFluff) {
          this.fluffMap.set(fluff.name, fluff);
        }
        this.log(`Loaded fluff data for ${fluffData.conditionFluff.length} conditions`);
      }
    } catch (error) {
      this.log('No condition fluff data found or failed to load');
    }
  }

  /**
   * Convert array of conditions using the new pipeline
   */
  public async convertConditions(): Promise<{
    success: boolean;
    results: ConditionDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed condition conversion...');
      
      // Load fluff data for images and enhanced descriptions
      await this.loadFluffData();
      
      const results: ConditionDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read condition data using typed approach
      const rawData = await this.readEtoolsData('conditionsdiseases.json');
      const conditionData = safeEtoolsCast<EtoolsConditionData>(
        rawData, 
        ['condition'], 
        'condition data file conditionsdiseases.json'
      );

      // Extract and filter conditions
      const conditions = extractEtoolsArray<EtoolsCondition>(
        conditionData, 
        'condition', 
        'condition list in conditionsdiseases.json'
      );
      const filteredConditions = this.filterSrdContent(conditions);
      
      total = filteredConditions.length;
      this.log(`Processing ${total} conditions`);

      // Convert each condition using the pipeline
      for (const condition of filteredConditions) {
        const result = await this.convertItem(condition);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Condition ${condition.name} converted successfully`);
        } else {
          errors.push(`❌ Condition ${condition.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Condition ${condition.name} failed:`, result.errors);
        }
      }

      this.log(`Typed condition conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Condition conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
   * Private helper methods for condition-specific parsing
   */

  private parseConditionEffectsAsObject(entries: any[], description: string): DndConditionData['effects'] {
    const lower = description.toLowerCase();
    
    const effects: DndConditionData['effects'] = {};
    
    // Movement restrictions
    if (lower.includes('speed') && (lower.includes('0') || lower.includes('halved'))) {
      effects.movement = {
        prevented: lower.includes('speed') && lower.includes('0'),
        reduced: lower.includes('halved'),
        speedReduction: lower.includes('halved') ? 0.5 : undefined
      };
    }
    
    // Action restrictions
    if (lower.includes('can\'t take actions') || lower.includes('cannot take actions') || 
        lower.includes('incapacitated') || lower.includes('stunned')) {
      effects.actions = {
        prevented: lower.includes('can\'t take actions') || lower.includes('cannot take actions') || lower.includes('stunned'),
        disadvantage: lower.includes('disadvantage') && lower.includes('action')
      };
    }
    
    // Attack roll modifications
    if (lower.includes('attack') && (lower.includes('advantage') || lower.includes('disadvantage') || lower.includes('can\'t attack'))) {
      effects.attackRolls = {
        advantage: lower.includes('attack rolls have advantage'),
        disadvantage: lower.includes('attack rolls have disadvantage'),
        prevented: lower.includes('can\'t attack') || lower.includes('cannot attack')
      };
    }
    
    // Saving throw modifications
    if (lower.includes('saving throw') && (lower.includes('advantage') || lower.includes('disadvantage'))) {
      effects.savingThrows = {
        advantage: lower.includes('saving throws have advantage'),
        disadvantage: lower.includes('saving throws have disadvantage')
      };
    }
    
    // How others interact with affected creature
    if (lower.includes('attacks against') && (lower.includes('advantage') || lower.includes('disadvantage'))) {
      effects.againstAffected = {
        attackAdvantage: lower.includes('attacks against') && lower.includes('advantage'),
        attackDisadvantage: lower.includes('attacks against') && lower.includes('disadvantage')
      };
    }
    
    return effects;
  }

  private parseConditionDuration(description: string): DndConditionData['duration'] {
    const lower = description.toLowerCase();
    
    // Some conditions are until removed
    if (lower.includes('until removed') || lower.includes('permanently')) {
      return {
        type: 'until_removed',
        specific: 'Until removed'
      };
    }
    
    // Most conditions have time-based duration that varies by source
    if (lower.includes('minute') || lower.includes('hour') || lower.includes('day')) {
      return {
        type: 'time_based',
        specific: 'Varies by source'
      };
    }
    
    // Default for most conditions - they last until removed
    return {
      type: 'until_removed',
      specific: 'Varies by source'
    };
  }


  /**
   * Override base class methods for condition-specific behavior
   */

  protected determineCategory(input: EtoolsCondition): string | undefined {
    return 'Conditions';
  }

  protected extractTags(input: EtoolsCondition): string[] {
    const tags = super.extractTags(input);
    
    // Add condition-specific tags
    if (input.basicRules2024 || input.basicRules) {
      tags.push('basic-rules');
    }
    
    return tags;
  }

  protected calculateSortOrder(input: EtoolsCondition): number {
    // Sort alphabetically by name
    return 0; // Base order, will be adjusted by index in batch conversion
  }
}
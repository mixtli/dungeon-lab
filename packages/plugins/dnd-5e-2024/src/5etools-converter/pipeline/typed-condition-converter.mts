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
 * Typed condition converter using the new pipeline
 */
export class TypedConditionConverter extends TypedConverter<
  typeof etoolsConditionSchema,
  typeof dndConditionDataSchema,
  ConditionDocument
> {
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
    return processEntries(input.entries, this.options.textProcessing).text;
  }

  protected transformData(input: EtoolsCondition): DndConditionData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page,
      effects: this.parseConditionEffects(input.entries),
      severity: this.determineSeverity(description),
      relatedConditions: this.extractRelatedConditions(description),
      mechanics: this.parseConditionMechanics(description)
    };
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

  private parseConditionEffects(entries: any[]): string[] | undefined {
    const effects: string[] = [];
    
    for (const entry of entries) {
      if (typeof entry === 'string') {
        effects.push(entry);
      } else if (entry && typeof entry === 'object' && entry.type === 'list' && Array.isArray(entry.items)) {
        for (const item of entry.items) {
          if (typeof item === 'string') {
            effects.push(item);
          }
        }
      }
    }
    
    return effects.length > 0 ? effects : undefined;
  }

  private determineSeverity(description: string): 'minor' | 'moderate' | 'severe' | undefined {
    const lower = description.toLowerCase();
    
    if (lower.includes('unconscious') || lower.includes('paralyzed') || lower.includes('petrified')) {
      return 'severe';
    }
    if (lower.includes('stunned') || lower.includes('incapacitated')) {
      return 'severe';
    }
    if (lower.includes('restrained') || lower.includes('grappled') || lower.includes('prone')) {
      return 'moderate';
    }
    
    return 'minor';
  }

  private extractRelatedConditions(description: string): string[] | undefined {
    const conditions = [
      'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
      'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
      'stunned', 'unconscious', 'exhaustion'
    ];
    
    const found = conditions.filter(condition => 
      description.toLowerCase().includes(condition) && 
      !description.toLowerCase().startsWith(condition) // Don't include self
    );
    
    return found.length > 0 ? found : undefined;
  }

  private parseConditionMechanics(description: string): DndConditionData['mechanics'] {
    const lower = description.toLowerCase();
    const mechanics: NonNullable<DndConditionData['mechanics']> = {};
    
    // Parse basic mechanical effects
    if (lower.includes('can\'t see') || lower.includes('cannot see')) {
      mechanics.affectsSight = true;
    }
    
    if (lower.includes('speed') && lower.includes('0')) {
      mechanics.affectsMovement = true;
    }
    
    if (lower.includes('can\'t take actions') || lower.includes('cannot take actions')) {
      mechanics.affectsActions = true;
      mechanics.preventsActions = true;
    }
    
    if (lower.includes('can\'t take reactions') || lower.includes('cannot take reactions')) {
      mechanics.preventsReactions = true;
    }
    
    if (lower.includes('can\'t speak') || lower.includes('cannot speak')) {
      mechanics.preventsSpeech = true;
    }

    // Parse advantage/disadvantage
    const advantageDisadvantage: NonNullable<NonNullable<DndConditionData['mechanics']>['advantageDisadvantage']> = {};
    
    if (lower.includes('attack rolls have disadvantage')) {
      advantageDisadvantage.attackRolls = 'disadvantage';
    }
    if (lower.includes('attack rolls have advantage')) {
      advantageDisadvantage.attackRolls = 'advantage';
    }
    if (lower.includes('attack rolls against the creature have advantage')) {
      advantageDisadvantage.attacksAgainst = 'advantage';
    }
    if (lower.includes('ability check') && lower.includes('disadvantage')) {
      advantageDisadvantage.abilityChecks = 'disadvantage';
    }
    if (lower.includes('saving throw') && lower.includes('disadvantage')) {
      advantageDisadvantage.savingThrows = 'disadvantage';
    }
    
    if (Object.keys(advantageDisadvantage).length > 0) {
      mechanics.advantageDisadvantage = advantageDisadvantage;
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
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
    
    const severity = this.determineSeverity(this.extractDescription(input));
    if (severity) {
      tags.push(severity);
    }
    
    return tags;
  }

  protected calculateSortOrder(input: EtoolsCondition): number {
    // Sort alphabetically by name
    return 0; // Base order, will be adjusted by index in batch conversion
  }
}
/**
 * Type-safe rule converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Comprehensive rule data extraction with mechanics, categories, and subsections
 */

import { z } from 'zod';
import { TypedConverter } from './typed-converter.mjs';
import { 
  type RuleDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsVariantRuleData, EtoolsRuleType } from '../../5etools-types/variantrules.mjs';
import { etoolsVariantRuleSchema } from '../../5etools-types/variantrules.mjs';
import { 
  dndRuleDataSchema, 
  type DndRuleData
} from '../../types/dnd/rule.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// RuleDocument type is now imported from the validators file

/**
 * Typed rule converter using the new pipeline
 */
export class TypedRuleConverter extends TypedConverter<
  typeof etoolsVariantRuleSchema,
  typeof dndRuleDataSchema,
  RuleDocument
> {

  protected getInputSchema() {
    return etoolsVariantRuleSchema;
  }

  protected getOutputSchema() {
    return dndRuleDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'rule';
  }

  protected extractDescription(input: z.infer<typeof etoolsVariantRuleSchema>): string {
    if (input.entries && input.entries.length > 0) {
      const processed = processEntries(input.entries, this.options.textProcessing);
      return processed.text || `${input.name} is a game rule.`;
    }
    return `${input.name} is a game rule.`;
  }

  protected extractAssetPath(_input: z.infer<typeof etoolsVariantRuleSchema>): string | undefined {
    // Rules typically don't have associated images
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsVariantRuleSchema>): DndRuleData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page,
      
      // Convert rule type from 5etools format
      ruleType: this.convertRuleType(input.ruleType),
      
      // Categorize the rule based on content
      category: this.parseRuleCategory(input, description),
      
      // Determine if this is a basic rule
      isBasicRule: this.isBasicRule(input),
      
      // Extract subsections from entries
      subsections: this.parseSubsections(input.entries),
      
      // Note: Related rules and prerequisites would need manual curation
      // as they're not structured in the 5etools data
      
      // Note: Examples would need manual curation as they're not structured in 5etools data
      
      // Generate tags
      tags: this.generateTags(input, description)
    };
  }

  /**
   * Convert array of rules from the variantrules.json file
   */
  public async convertRules(): Promise<{
    success: boolean;
    results: RuleDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed rule conversion...');
      
      const results: RuleDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Process variantrules.json file
      const filename = 'variantrules.json';
      
      try {
        const rawData = await this.readEtoolsData(filename);
        const ruleData = safeEtoolsCast<EtoolsVariantRuleData>(rawData, ['variantrule'], `rule data file ${filename}`);
        
        if (!ruleData.variantrule?.length) {
          this.log(`No rules found in ${filename}`);
          return {
            success: true,
            results: [],
            errors: [],
            stats: { total: 0, converted: 0, errors: 0 }
          };
        }

        const filteredRules = this.filterSrdContent(ruleData.variantrule);
        total += filteredRules.length;
        
        this.log(`Processing ${filteredRules.length} rules from ${filename}`);

        for (const rule of filteredRules) {
          const result = await this.convertItem(rule);
          
          if (result.success && result.document) {
            results.push(result.document);
            converted++;
            this.log(`✅ Rule ${rule.name} converted successfully`);
          } else {
            errors.push(`Failed to convert rule ${rule.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
            this.log(`❌ Rule ${rule.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
          }
        }
      } catch (fileError) {
        const errorMsg = `Failed to process ${filename}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        this.log(errorMsg);
      }
      
      this.log(`Typed rule conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Rule conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  // Helper methods for extracting rule-specific data

  private convertRuleType(ruleType: EtoolsRuleType): DndRuleData['ruleType'] {
    switch (ruleType) {
      case 'C': return 'core';
      case 'O': return 'optional';
      case 'V': return 'variant';
      case 'VO': return 'variant_optional';
      default: return 'core';
    }
  }

  private parseRuleCategory(input: z.infer<typeof etoolsVariantRuleSchema>, _description: string): DndRuleData['category'] {
    // Only use rule name for categorization (more reliable than full text parsing)
    const name = input.name.toLowerCase();
    
    // Use rule type to help determine category
    const ruleType = this.convertRuleType(input.ruleType);
    
    // Combat-related rules
    if (name.includes('combat') || name.includes('attack') || name.includes('damage') || 
        name.includes('initiative') || name.includes('action')) {
      return 'combat';
    }
    
    // Magic-related rules
    if (name.includes('spell') || name.includes('magic') || name.includes('casting')) {
      return 'magic';
    }
    
    // Equipment-related rules  
    if (name.includes('equipment') || name.includes('item') || name.includes('weapon') || 
        name.includes('armor') || name.includes('adamantine')) {
      return 'equipment';
    }
    
    // Basic definitions (core rule explanations)
    if (name.includes('ability') || name.includes('advantage') || name.includes('disadvantage') || 
        name.includes('check') || name.includes('modifier') || name.includes('proficiency')) {
      return 'definitions';
    }
    
    // Use rule type to categorize variant/optional rules
    if (ruleType === 'variant' || ruleType === 'variant_optional') {
      return 'variant_rules';
    }
    if (ruleType === 'optional') {
      return 'optional_rules';
    }
    
    // Default to definitions for core rules
    return 'definitions';
  }

  private isBasicRule(input: z.infer<typeof etoolsVariantRuleSchema>): boolean {
    return !!(input.srd || input.basicRules || input.srd52 || input.basicRules2024);
  }

  private parseSubsections(entries: EtoolsEntry[]): DndRuleData['subsections'] {
    const subsections: NonNullable<DndRuleData['subsections']> = [];
    
    for (const entry of entries) {
      // Only process object entries
      if (typeof entry === 'object' && entry !== null) {
        // Handle entries with type "entries" that have named subsections
        if (entry.type === 'entries' && 'name' in entry && entry.name && 'entries' in entry && entry.entries) {
          const description = Array.isArray(entry.entries) ? 
            processEntries(entry.entries, this.options.textProcessing).text : 
            (typeof entry.entries === 'string' ? entry.entries : '');
          
          if (description) {
            subsections.push({
              name: entry.name,
              description
            });
          }
        }
        // Handle other named entry types that might contain subsection content
        else if (entry.type && ['inset', 'insetReadaloud', 'section'].includes(entry.type) && 'name' in entry && entry.name) {
          // For other entry types, try to extract content if available
          const content = ('entries' in entry && entry.entries) ? 
            (Array.isArray(entry.entries) ? 
              processEntries(entry.entries, this.options.textProcessing).text : 
              (typeof entry.entries === 'string' ? entry.entries : '')) : '';
          
          if (content) {
            subsections.push({
              name: entry.name,
              description: content
            });
          }
        }
      }
    }
    
    return subsections.length > 0 ? subsections : undefined;
  }




  private generateTags(input: z.infer<typeof etoolsVariantRuleSchema>, description: string): DndRuleData['tags'] {
    const tags: string[] = [];
    
    // Add rule type tag (from structured data)
    tags.push(this.convertRuleType(input.ruleType));
    
    // Add source tag if available (from structured data)
    if (input.source) {
      tags.push(input.source.toLowerCase());
    }
    
    // Add basic rule tag (from structured flags)
    if (this.isBasicRule(input)) {
      tags.push('basic-rules');
    }
    
    // Add category as tag (from structured classification)
    const category = this.parseRuleCategory(input, description);
    if (category) {
      tags.push(category);
    }
    
    return tags.length > 0 ? tags : undefined;
  }
}
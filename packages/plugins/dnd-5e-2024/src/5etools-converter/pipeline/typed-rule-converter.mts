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

import { TypedConverter } from './typed-converter.mjs';
import { 
  type RuleDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsVariantRule, EtoolsVariantRuleData, EtoolsRuleType } from '../../5etools-types/variantrules.mjs';
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

  protected extractDescription(input: EtoolsVariantRule): string {
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `${input.name} is a game rule.`;
  }

  protected extractAssetPath(input: EtoolsVariantRule): string | undefined {
    // Rules typically don't have associated images
    return undefined;
  }

  protected transformData(input: EtoolsVariantRule): DndRuleData {
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
      
      // Extract related rules
      relatedRules: this.extractRelatedRules(input, description),
      
      // Extract prerequisites
      prerequisites: this.extractPrerequisites(input, description),
      
      // Extract mechanical impact
      mechanics: this.extractMechanics(input, description),
      
      // Extract examples
      examples: this.extractExamples(input, description),
      
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

  private parseRuleCategory(input: EtoolsVariantRule, description: string): DndRuleData['category'] {
    const nameDesc = (input.name + ' ' + description).toLowerCase();
    
    if (nameDesc.includes('combat') || nameDesc.includes('attack') || nameDesc.includes('damage')) {
      return 'combat';
    }
    if (nameDesc.includes('spell') || nameDesc.includes('magic') || nameDesc.includes('casting')) {
      return 'magic';
    }
    if (nameDesc.includes('equipment') || nameDesc.includes('item') || nameDesc.includes('weapon')) {
      return 'equipment';
    }
    if (nameDesc.includes('exploration') || nameDesc.includes('travel') || nameDesc.includes('environment')) {
      return 'exploration';
    }
    if (nameDesc.includes('social') || nameDesc.includes('interaction') || nameDesc.includes('influence')) {
      return 'social';
    }
    if (nameDesc.includes('character') || nameDesc.includes('creation') || nameDesc.includes('background')) {
      return 'character_creation';
    }
    if (nameDesc.includes('advancement') || nameDesc.includes('level') || nameDesc.includes('experience')) {
      return 'advancement';
    }
    if (nameDesc.includes('condition') || nameDesc.includes('status')) {
      return 'conditions';
    }
    if (nameDesc.includes('downtime') || nameDesc.includes('activity')) {
      return 'downtime';
    }
    if (nameDesc.includes('variant') || nameDesc.includes('alternative')) {
      return 'variant_rules';
    }
    if (nameDesc.includes('optional')) {
      return 'optional_rules';
    }
    if (nameDesc.includes('dm') || nameDesc.includes('dungeon master')) {
      return 'dm_tools';
    }
    
    // Check for definitions (basic rule explanations)
    if (nameDesc.includes('ability check') || nameDesc.includes('action') || nameDesc.includes('advantage')) {
      return 'definitions';
    }
    
    return 'definitions'; // Default for basic rule definitions
  }

  private isBasicRule(input: EtoolsVariantRule): boolean {
    return !!(input.srd || input.basicRules || input.srd52 || input.basicRules2024);
  }

  private parseSubsections(entries: EtoolsEntry[]): DndRuleData['subsections'] {
    const subsections: NonNullable<DndRuleData['subsections']> = [];
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry.type === 'entries' && entry.name) {
        const description = Array.isArray(entry.entries) ? 
          processEntries(entry.entries, this.options.textProcessing).text : 
          (typeof entry.entries === 'string' ? entry.entries : '');
        
        subsections.push({
          name: entry.name,
          description
        });
      }
    }
    
    return subsections.length > 0 ? subsections : undefined;
  }

  private extractRelatedRules(input: EtoolsVariantRule, description: string): DndRuleData['relatedRules'] {
    const related: string[] = [];
    const desc = description.toLowerCase();
    
    // Look for common rule references
    if (desc.includes('advantage') || desc.includes('disadvantage')) {
      related.push('Advantage and Disadvantage');
    }
    if (desc.includes('proficiency bonus')) {
      related.push('Proficiency Bonus');
    }
    if (desc.includes('ability check')) {
      related.push('Ability Checks');
    }
    if (desc.includes('saving throw')) {
      related.push('Saving Throws');
    }
    if (desc.includes('attack roll')) {
      related.push('Attack Rolls');
    }
    if (desc.includes('initiative')) {
      related.push('Initiative');
    }
    if (desc.includes('concentration')) {
      related.push('Concentration');
    }
    
    return related.length > 0 ? related : undefined;
  }

  private extractPrerequisites(input: EtoolsVariantRule, description: string): DndRuleData['prerequisites'] {
    const prerequisites: NonNullable<DndRuleData['prerequisites']> = {};
    const desc = description.toLowerCase();
    
    // Check for level requirements
    const levelMatch = desc.match(/(\d+)(?:st|nd|rd|th)[-\s]?level/i);
    if (levelMatch) {
      prerequisites.level = parseInt(levelMatch[1], 10);
    }
    
    // Check for DM approval mentions
    if (desc.includes('dm') || desc.includes('dungeon master') || desc.includes('gm') || desc.includes('game master')) {
      if (desc.includes('approval') || desc.includes('permission') || desc.includes('discretion')) {
        prerequisites.dmApproval = true;
      }
    }
    
    // Check for other rule dependencies
    const otherRules: string[] = [];
    if (desc.includes('variant rule')) {
      otherRules.push('Other variant rules');
    }
    if (desc.includes('optional rule')) {
      otherRules.push('Other optional rules');
    }
    
    if (otherRules.length > 0) {
      prerequisites.otherRules = otherRules;
    }
    
    return Object.keys(prerequisites).length > 0 ? prerequisites : undefined;
  }

  private extractMechanics(input: EtoolsVariantRule, description: string): DndRuleData['mechanics'] {
    const mechanics: NonNullable<DndRuleData['mechanics']> = {};
    const desc = description.toLowerCase();
    
    // Determine if this modifies core mechanics
    const coreKeywords = ['ability check', 'attack roll', 'damage roll', 'saving throw', 'spell', 'movement', 'rest'];
    mechanics.modifiesCoreMechanics = coreKeywords.some(keyword => desc.includes(keyword));
    
    // Determine what this rule affects
    const affects: NonNullable<NonNullable<DndRuleData['mechanics']>['affects']> = [];
    
    if (desc.includes('ability check')) affects.push('ability_checks');
    if (desc.includes('attack roll')) affects.push('attack_rolls');
    if (desc.includes('damage')) affects.push('damage_rolls');
    if (desc.includes('saving throw')) affects.push('saving_throws');
    if (desc.includes('spell')) affects.push('spell_casting');
    if (desc.includes('movement') || desc.includes('speed')) affects.push('movement');
    if (desc.includes('rest')) affects.push('resting');
    if (desc.includes('death save')) affects.push('death_saves');
    if (desc.includes('initiative')) affects.push('initiative');
    if (desc.includes('condition')) affects.push('conditions');
    if (desc.includes('equipment') || desc.includes('item')) affects.push('equipment');
    if (desc.includes('magic item')) affects.push('magic_items');
    
    if (affects.length > 0) {
      mechanics.affects = affects;
    }
    
    // Determine complexity
    const wordCount = description.split(' ').length;
    if (wordCount < 50) {
      mechanics.complexity = 'simple';
    } else if (wordCount < 200) {
      mechanics.complexity = 'moderate';
    } else {
      mechanics.complexity = 'complex';
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  private extractExamples(input: EtoolsVariantRule, description: string): DndRuleData['examples'] {
    // Look for example patterns in the description
    const examples: NonNullable<DndRuleData['examples']> = [];
    const desc = description;
    
    // Look for "For example" or "Example:" patterns
    const examplePatterns = [
      /for example[,:]\s*([^.]+\.)/gi,
      /example[,:]\s*([^.]+\.)/gi,
      /such as[,:]\s*([^.]+\.)/gi
    ];
    
    for (const pattern of examplePatterns) {
      let match;
      while ((match = pattern.exec(desc)) !== null) {
        const exampleText = match[1].trim();
        if (exampleText.length > 10) { // Only include substantial examples
          examples.push({
            situation: `Example scenario`,
            ruling: exampleText
          });
        }
      }
    }
    
    return examples.length > 0 ? examples : undefined;
  }

  private generateTags(input: EtoolsVariantRule, description: string): DndRuleData['tags'] {
    const tags: string[] = [];
    const nameDesc = (input.name + ' ' + description).toLowerCase();
    
    // Add rule type tags
    tags.push(this.convertRuleType(input.ruleType));
    
    // Add content-based tags
    if (nameDesc.includes('optional')) tags.push('optional');
    if (nameDesc.includes('variant')) tags.push('variant');
    if (nameDesc.includes('dm') || nameDesc.includes('dungeon master')) tags.push('dm-tools');
    if (nameDesc.includes('player')) tags.push('player-facing');
    if (nameDesc.includes('homebrew')) tags.push('homebrew');
    if (nameDesc.includes('house rule')) tags.push('house-rule');
    if (nameDesc.includes('combat')) tags.push('combat');
    if (nameDesc.includes('exploration')) tags.push('exploration');
    if (nameDesc.includes('social')) tags.push('social');
    if (nameDesc.includes('magic')) tags.push('magic');
    if (nameDesc.includes('equipment')) tags.push('equipment');
    
    // Add source tag if available
    if (input.source) {
      tags.push(input.source.toLowerCase());
    }
    
    // Add complexity tag
    const wordCount = description.split(' ').length;
    if (wordCount < 50) {
      tags.push('simple');
    } else if (wordCount < 200) {
      tags.push('moderate');
    } else {
      tags.push('complex');
    }
    
    // Add basic rule tag
    if (this.isBasicRule(input)) {
      tags.push('basic-rules');
    }
    
    return tags.length > 0 ? tags : undefined;
  }
}
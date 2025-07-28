/**
 * Rule (Variant Rule) converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsVariantRule, EtoolsVariantRuleData, EtoolsRuleType } from '../../5etools-types/variantrules.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import { transformMonsterEntries } from '../utils/reference-transformer.mjs';
import type { DndRuleData } from '../../types/dnd/index.mjs';

export class RuleWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting rule wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read rule data
      const ruleFiles = [
        'variantrules.json'
      ];

      for (const fileName of ruleFiles) {
        try {
          const rawData = await readEtoolsData(fileName);
          const ruleData = safeEtoolsCast<EtoolsVariantRuleData>(rawData, ['variantrule'], `rule data file ${fileName}`);

          // Process rules
          const rules = extractEtoolsArray<EtoolsVariantRule>(ruleData, 'variantrule', `rule list in ${fileName}`);
          const filteredRules = this.options.srdOnly ? filterSrdContent(rules) : rules;
          
          stats.total += filteredRules.length;
          this.log(`Processing ${filteredRules.length} rules from ${fileName}`);

          for (let i = 0; i < filteredRules.length; i++) {
            const ruleRaw = filteredRules[i];
            try {
              const rule = this.convertRule(ruleRaw);

              // Create wrapper format
              const wrapper = this.createWrapper(
                rule.name,
                rule,
                'vtt-document',
                {
                  category: this.determineCategory(ruleRaw, 'vtt-document'),
                  tags: this.extractTags(ruleRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(ruleRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: fileName
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting rule ${ruleRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      this.log(`Rule wrapper conversion complete. Stats:`, stats);
      
      return {
        success: true,
        content,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private convertRule(ruleData: EtoolsVariantRule): { 
    id: string; 
    slug: string; 
    name: string; 
    documentType: 'vtt-document';
    pluginDocumentType: 'rule';
    pluginId: 'dnd-5e-2024';
    campaignId: string;
    description: string;
    userData: Record<string, unknown>;
    pluginData: DndRuleData;
  } {
    // Transform entries to extract references
    const transformResult = transformMonsterEntries(ruleData.entries);
    const description = formatEntries(transformResult.entries);

    // Convert rule type
    const ruleType = this.convertRuleType(ruleData.ruleType);
    
    // Parse rule details
    const category = this.parseRuleCategory(ruleData.name, description);
    const isBasicRule = this.isBasicRule(ruleData);
    const mechanics = this.parseRuleMechanics(description);
    const subsections = this.parseSubsections(ruleData.entries);

    const rule = {
      id: `rule-${generateSlug(ruleData.name)}`,
      slug: generateSlug(ruleData.name),
      name: ruleData.name,
      documentType: 'vtt-document' as const, // Correct documentType from schema
      pluginDocumentType: 'rule' as const,
      pluginId: 'dnd-5e-2024' as const,
      campaignId: '',
      description,
      userData: {},
      
      // Plugin-specific data nested in pluginData
      pluginData: {
        ruleType,
        source: ruleData.source,
        page: ruleData.page,
        category,
        isBasicRule,
        subsections,
        mechanics,
        tags: this.parseRuleTags(ruleData.name, description),
        relatedRules: this.extractRelatedRules(description)
      } as DndRuleData
    };

    return rule;
  }

  private convertRuleType(ruleType: EtoolsRuleType): DndRuleData['ruleType'] {
    switch (ruleType) {
      case 'C': return 'core';
      case 'O': return 'optional';
      case 'V': return 'variant';
      case 'VO': return 'variant_optional';
      default: return 'core';
    }
  }

  private parseRuleCategory(name: string, description: string): DndRuleData['category'] {
    const nameDesc = (name + ' ' + description).toLowerCase();
    
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
    
    // Check for definitions (basic rule explanations)
    if (nameDesc.includes('ability check') || nameDesc.includes('action') || nameDesc.includes('advantage')) {
      return 'definitions';
    }
    
    return 'definitions'; // Default for basic rule definitions
  }

  private isBasicRule(ruleData: EtoolsVariantRule): boolean {
    return !!(ruleData.srd || ruleData.basicRules || ruleData.srd52 || ruleData.basicRules2024);
  }

  private parseRuleMechanics(description: string): DndRuleData['mechanics'] {
    const mechanics: NonNullable<DndRuleData['mechanics']> = {};
    
    // Determine if this modifies core mechanics
    const coreKeywords = ['ability check', 'attack roll', 'damage roll', 'saving throw', 'spell', 'movement', 'rest'];
    mechanics.modifiesCoreMechanics = coreKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
    
    // Determine what this rule affects
    const affects: NonNullable<NonNullable<DndRuleData['mechanics']>['affects']> = [];
    
    if (description.toLowerCase().includes('ability check')) affects.push('ability_checks');
    if (description.toLowerCase().includes('attack roll')) affects.push('attack_rolls');
    if (description.toLowerCase().includes('damage')) affects.push('damage_rolls');
    if (description.toLowerCase().includes('saving throw')) affects.push('saving_throws');
    if (description.toLowerCase().includes('spell')) affects.push('spell_casting');
    if (description.toLowerCase().includes('movement') || description.toLowerCase().includes('speed')) affects.push('movement');
    if (description.toLowerCase().includes('rest')) affects.push('resting');
    if (description.toLowerCase().includes('death save')) affects.push('death_saves');
    if (description.toLowerCase().includes('initiative')) affects.push('initiative');
    if (description.toLowerCase().includes('condition')) affects.push('conditions');
    if (description.toLowerCase().includes('equipment') || description.toLowerCase().includes('item')) affects.push('equipment');
    if (description.toLowerCase().includes('magic item')) affects.push('magic_items');
    
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

  private parseSubsections(entries: EtoolsEntry[]): DndRuleData['subsections'] {
    const subsections: NonNullable<DndRuleData['subsections']> = [];
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry.type === 'entries' && entry.name) {
        const description = Array.isArray(entry.entries) ? 
          formatEntries(entry.entries) : 
          (typeof entry.entries === 'string' ? entry.entries : '');
        
        subsections.push({
          name: entry.name,
          description
        });
      }
    }
    
    return subsections.length > 0 ? subsections : undefined;
  }

  private parseRuleTags(name: string, description: string): string[] | undefined {
    const tags: string[] = [];
    
    const nameDesc = (name + ' ' + description).toLowerCase();
    
    // Add relevant tags based on content
    if (nameDesc.includes('optional')) tags.push('optional');
    if (nameDesc.includes('variant')) tags.push('variant');
    if (nameDesc.includes('dm') || nameDesc.includes('dungeon master')) tags.push('dm-tools');
    if (nameDesc.includes('player')) tags.push('player-facing');
    if (nameDesc.includes('homebrew')) tags.push('homebrew');
    if (nameDesc.includes('house rule')) tags.push('house-rule');
    
    return tags.length > 0 ? tags : undefined;
  }

  private extractRelatedRules(_description: string): string[] | undefined {
    // This could be enhanced to parse cross-references to other rules
    // For now, return undefined
    return undefined;
  }
}
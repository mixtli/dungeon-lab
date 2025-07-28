/**
 * Condition converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateConditionData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { EtoolsCondition, EtoolsConditionData } from '../../5etools-types/conditions.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import { transformMonsterEntries } from '../utils/reference-transformer.mjs';
import type { DndConditionData } from '../../types/dnd/index.mjs';

export class ConditionWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting condition wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read condition data
      const conditionFiles = [
        'conditionsdiseases.json'
      ];

      for (const fileName of conditionFiles) {
        try {
          const rawData = await readEtoolsData(fileName);
          const conditionData = safeEtoolsCast<EtoolsConditionData>(rawData, ['condition'], `condition data file ${fileName}`);

          // Process conditions
          const conditions = extractEtoolsArray<EtoolsCondition>(conditionData, 'condition', `condition list in ${fileName}`);
          const filteredConditions = this.options.srdOnly ? filterSrdContent(conditions) : conditions;
          
          stats.total += filteredConditions.length;
          this.log(`Processing ${filteredConditions.length} conditions from ${fileName}`);

          for (let i = 0; i < filteredConditions.length; i++) {
            const conditionRaw = filteredConditions[i];
            try {
              const { condition, validationResult } = await this.convertCondition(conditionRaw);
              // Condition is already properly typed for wrapper creation

              // Check validation result
              if (!validationResult.success) {
                this.log(`❌ Condition ${conditionRaw.name} failed validation:`, validationResult.errors);
                stats.errors++;
                continue; // Skip this condition and continue with next
              }

              // Log successful validation
              this.log(`✅ Condition ${conditionRaw.name} validated successfully`);

              // Create wrapper format using the full document structure
              const wrapper = this.createWrapper(
                condition.name,
                condition, // Always use the full structure for proper directory mapping
                'vtt-document',
                {
                  category: this.determineCategory(conditionRaw, 'vtt-document'),
                  tags: this.extractTags(conditionRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(conditionRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: fileName
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`Error converting condition ${conditionRaw.name}:`, error);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      this.log(`Condition wrapper conversion complete. Stats:`, stats);
      
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

  private async convertCondition(conditionData: EtoolsCondition): Promise<{ condition: {
    id: string;
    slug: string;
    name: string;
    documentType: string;
    pluginDocumentType: string;
    pluginId: string;
    campaignId: string;
    description: string;
    userData: Record<string, unknown>;
    pluginData: unknown;
  }; validationResult: ValidationResult }> {
    // Transform entries to extract references
    const transformResult = transformMonsterEntries(conditionData.entries);
    const description = formatEntries(transformResult.entries);

    // Create simplified condition structure for validation
    const conditionDataForValidation = {
      name: conditionData.name,
      description,
      source: conditionData.source,
      page: conditionData.page,
      effects: this.parseConditionEffectsAsStrings(conditionData.entries),
      severity: this.determineSeverity(description),
      relatedConditions: this.extractRelatedConditions(description)
    };

    // Create full document structure for output
    const condition = {
      id: `condition-${generateSlug(conditionData.name)}`,
      slug: generateSlug(conditionData.name),
      name: conditionData.name,
      documentType: 'vtt-document', // Correct documentType from schema
      pluginDocumentType: 'condition',
      pluginId: 'dnd-5e-2024',
      campaignId: '',
      description,
      userData: {},
      pluginData: conditionDataForValidation
    };

    // Validate the simplified condition data against the schema
    const validationResult = await validateConditionData(conditionDataForValidation);

    return { condition, validationResult };
  }

  /**
   * Parse condition effects as simple strings for canonical schema validation
   */
  private parseConditionEffectsAsStrings(entries: EtoolsEntry[]): string[] | undefined {
    const effects: string[] = [];
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry.type === 'list' && entry.items) {
        for (const item of entry.items) {
          if (typeof item === 'string') {
            effects.push(item);
          }
        }
      } else if (typeof entry === 'string') {
        effects.push(entry);
      }
    }
    
    return effects.length > 0 ? effects : undefined;
  }

  // @ts-expect-error - Future functionality for advanced condition parsing
  private parseConditionEffectsForSchema(entries: EtoolsEntry[]): Array<{
    type: 'advantage' | 'disadvantage' | 'immunity' | 'resistance' | 'vulnerability' | 'modifier' | 'restriction' | 'other';
    target: string;
    description: string;
  }> | undefined {
    const effects: Array<{
      type: 'advantage' | 'disadvantage' | 'immunity' | 'resistance' | 'vulnerability' | 'modifier' | 'restriction' | 'other';
      target: string;
      description: string;
    }> = [];
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry.type === 'list' && entry.items) {
        for (const item of entry.items) {
          if (typeof item === 'string') {
            effects.push({
              type: this.classifyEffectType(item),
              target: 'creature',
              description: item
            });
          }
        }
      } else if (typeof entry === 'string') {
        effects.push({
          type: this.classifyEffectType(entry),
          target: 'creature',
          description: entry
        });
      }
    }
    
    return effects.length > 0 ? effects : undefined;
  }

  private classifyEffectType(description: string): 'advantage' | 'disadvantage' | 'immunity' | 'resistance' | 'vulnerability' | 'modifier' | 'restriction' | 'other' {
    const lower = description.toLowerCase();
    if (lower.includes('advantage')) return 'advantage';
    if (lower.includes('disadvantage')) return 'disadvantage';
    if (lower.includes('immune') || lower.includes('immunity')) return 'immunity';
    if (lower.includes('resistance') || lower.includes('resistant')) return 'resistance';
    if (lower.includes('vulnerable') || lower.includes('vulnerability')) return 'vulnerability';
    if (lower.includes('can\'t') || lower.includes('cannot') || lower.includes('unable')) return 'restriction';
    if (lower.includes('+') || lower.includes('-') || lower.includes('bonus') || lower.includes('penalty')) return 'modifier';
    return 'other';
  }

  private determineSeverity(description: string): 'minor' | 'moderate' | 'severe' | undefined {
    const lower = description.toLowerCase();
    if (lower.includes('unconscious') || lower.includes('paralyzed') || lower.includes('petrified')) return 'severe';
    if (lower.includes('stunned') || lower.includes('incapacitated')) return 'severe';
    if (lower.includes('restrained') || lower.includes('grappled') || lower.includes('prone')) return 'moderate';
    return 'minor';
  }

  // @ts-expect-error - Future functionality for condition duration parsing
  private extractDuration(description: string): string | undefined {
    const durationMatch = description.match(/(?:for|until|lasts?) (\d+\s+\w+|[^.]+)/i);
    return durationMatch ? durationMatch[1].trim() : undefined;
  }

  // @ts-expect-error - Future functionality for condition removal parsing
  private extractRemovalMethods(description: string): string[] | undefined {
    const methods: string[] = [];
    const lower = description.toLowerCase();
    
    if (lower.includes('end of turn') || lower.includes('end of its turn')) {
      methods.push('End of turn');
    }
    if (lower.includes('save') || lower.includes('saving throw')) {
      methods.push('Successful saving throw');
    }
    if (lower.includes('takes damage')) {
      methods.push('Taking damage');
    }
    if (lower.includes('action to')) {
      methods.push('Use action');
    }
    
    return methods.length > 0 ? methods : undefined;
  }

  // @ts-expect-error - Future functionality for condition effects parsing
  private parseConditionEffects(entries: EtoolsEntry[]): string[] {
    const effects: string[] = [];
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry.type === 'list' && entry.items) {
        // Extract list items as individual effects
        for (const item of entry.items) {
          if (typeof item === 'string') {
            effects.push(item);
          }
        }
      } else if (typeof entry === 'string') {
        effects.push(entry);
      }
    }
    
    return effects;
  }

  // @ts-expect-error - Future functionality for condition mechanics parsing
  private parseConditionMechanics(description: string): DndConditionData['mechanics'] {
    const mechanics: NonNullable<DndConditionData['mechanics']> = {};
    
    // Parse common mechanical effects
    if (description.toLowerCase().includes('can\'t see') || description.toLowerCase().includes('cannot see')) {
      mechanics.affectsSight = true;
    }
    
    if (description.toLowerCase().includes('speed') && description.toLowerCase().includes('0')) {
      mechanics.affectsMovement = true;
    }
    
    if (description.toLowerCase().includes('can\'t take actions') || description.toLowerCase().includes('cannot take actions')) {
      mechanics.affectsActions = true;
      mechanics.preventsActions = true;
    }
    
    if (description.toLowerCase().includes('can\'t take reactions') || description.toLowerCase().includes('cannot take reactions')) {
      mechanics.preventsReactions = true;
    }
    
    if (description.toLowerCase().includes('can\'t speak') || description.toLowerCase().includes('cannot speak')) {
      mechanics.preventsSpeech = true;
    }

    // Parse advantage/disadvantage
    const advantageDisadvantage: NonNullable<NonNullable<DndConditionData['mechanics']>['advantageDisadvantage']> = {};
    
    if (description.includes('attack rolls have disadvantage')) {
      advantageDisadvantage.attackRolls = 'disadvantage';
    }
    if (description.includes('attack rolls have advantage')) {
      advantageDisadvantage.attackRolls = 'advantage';
    }
    if (description.includes('Attack rolls against the creature have advantage')) {
      advantageDisadvantage.attacksAgainst = 'advantage';
    }
    
    if (Object.keys(advantageDisadvantage).length > 0) {
      mechanics.advantageDisadvantage = advantageDisadvantage;
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  private extractRelatedConditions(description: string): string[] | undefined {
    const conditions = ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 
                      'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 
                      'stunned', 'unconscious', 'exhaustion'];
    
    const found = conditions.filter(condition => 
      description.toLowerCase().includes(condition) && 
      !description.toLowerCase().startsWith(condition) // Don't include self
    );
    
    return found.length > 0 ? found : undefined;
  }
}
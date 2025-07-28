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
      
      // Read fluff data
      const fluffMap = new Map<string, EtoolsConditionFluff>();
      try {
        const rawFluffData = await readEtoolsData('fluff-conditionsdiseases.json');
        const fluffData = safeEtoolsCast<EtoolsConditionFluffData>(rawFluffData, [], 'condition fluff file');
        if (fluffData.conditionFluff) {
          for (const fluff of fluffData.conditionFluff) {
            fluffMap.set(fluff.name, fluff);
          }
        }
      } catch {
        this.log('No condition fluff data found');
      }

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
              const fluff = fluffMap.get(conditionRaw.name);
              const { condition, assetPath, validationResult } = await this.convertCondition(conditionRaw, fluff);
              // Condition is already properly typed for wrapper creation

              // Check validation result
              if (!validationResult.success) {
                this.log(`❌ ${conditionRaw.name}: ${validationResult.errors?.join(', ') || 'Validation failed'}`);
                stats.errors++;
                continue; // Skip this condition and continue with next
              }

              // Log successful validation
              this.log(`✅ ${conditionRaw.name}`);

              // Create wrapper format using the full document structure
              const wrapper = this.createWrapper(
                condition.name,
                condition, // Always use the full structure for proper directory mapping
                'vtt-document',
                {
                  imageId: assetPath,
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
              this.log(`❌ ${conditionRaw.name}: ${error instanceof Error ? error.message : 'Conversion error'}`);
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

  private async convertCondition(conditionData: EtoolsCondition, fluffData?: EtoolsConditionFluff): Promise<{ condition: {
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
  }; assetPath?: string; validationResult: ValidationResult }> {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }
    // Use fluff description if available, otherwise use condition entries
    let description = '';
    let transformResult: { entries: EtoolsEntry[]; references: any[] };
    
    if (fluffData?.entries) {
      transformResult = transformMonsterEntries(fluffData.entries);
      description = formatEntries(transformResult.entries);
    } else {
      transformResult = transformMonsterEntries(conditionData.entries);
      description = formatEntries(transformResult.entries);
    }

    // Create simplified condition structure for validation
    const conditionDataForValidation = {
      name: conditionData.name,
      description,
      source: conditionData.source,
      page: conditionData.page,
      effects: this.parseConditionEffectsForSchema(conditionData.entries),
      duration: this.extractDuration(description)
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

    return { condition, assetPath, validationResult };
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

  private parseConditionEffectsForSchema(entries: EtoolsEntry[]): {
    movement?: {
      prevented?: boolean;
      reduced?: boolean;
      speedReduction?: number;
    };
    actions?: {
      prevented?: boolean;
      disadvantage?: boolean;
    };
    attackRolls?: {
      advantage?: boolean;
      disadvantage?: boolean;
      prevented?: boolean;
    };
    savingThrows?: {
      advantage?: boolean;
      disadvantage?: boolean;
    };
    againstAffected?: {
      attackAdvantage?: boolean;
      attackDisadvantage?: boolean;
    };
  } {
    // Convert entries to plain text for analysis
    const fullText = this.extractTextFromEntries(entries).toLowerCase();
    
    const effects: {
      movement?: { prevented?: boolean; reduced?: boolean; speedReduction?: number };
      actions?: { prevented?: boolean; disadvantage?: boolean };
      attackRolls?: { advantage?: boolean; disadvantage?: boolean; prevented?: boolean };
      savingThrows?: { advantage?: boolean; disadvantage?: boolean };
      againstAffected?: { attackAdvantage?: boolean; attackDisadvantage?: boolean };
    } = {};
    
    // Parse movement effects
    if (fullText.includes("can't move") || fullText.includes("speed becomes 0") || fullText.includes("cannot move")) {
      effects.movement = { prevented: true };
    } else if (fullText.includes("speed is halved") || fullText.includes("movement is halved")) {
      effects.movement = { reduced: true, speedReduction: 50 };
    }
    
    // Parse action effects
    if (fullText.includes("can't take actions") || fullText.includes("cannot take actions") || fullText.includes("incapacitated")) {
      effects.actions = { prevented: true };
    } else if (fullText.includes("disadvantage on") && fullText.includes("ability check")) {
      effects.actions = { disadvantage: true };
    }
    
    // Parse attack roll effects
    if (fullText.includes("can't attack") || fullText.includes("cannot attack")) {
      effects.attackRolls = { prevented: true };
    } else if (fullText.includes("advantage on attack")) {
      effects.attackRolls = { advantage: true };
    } else if (fullText.includes("disadvantage on attack")) {
      effects.attackRolls = { disadvantage: true };
    }
    
    // Parse saving throw effects
    if (fullText.includes("advantage on") && (fullText.includes("saving throw") || fullText.includes("save"))) {
      effects.savingThrows = { advantage: true };
    } else if (fullText.includes("disadvantage on") && (fullText.includes("saving throw") || fullText.includes("save"))) {
      effects.savingThrows = { disadvantage: true };
    }
    
    // Parse effects against the affected creature
    if (fullText.includes("attack rolls against") && fullText.includes("advantage")) {
      effects.againstAffected = { attackAdvantage: true };
    } else if (fullText.includes("attack rolls against") && fullText.includes("disadvantage")) {
      effects.againstAffected = { attackDisadvantage: true };
    }
    
    return effects;
  }
  
  private extractTextFromEntries(entries: EtoolsEntry[]): string {
    const texts: string[] = [];
    
    for (const entry of entries) {
      if (typeof entry === 'string') {
        texts.push(entry);
      } else if (typeof entry === 'object' && entry) {
        if ('entries' in entry && Array.isArray(entry.entries)) {
          texts.push(this.extractTextFromEntries(entry.entries));
        }
        if ('items' in entry && Array.isArray(entry.items)) {
          texts.push(this.extractTextFromEntries(entry.items));
        }
      }
    }
    
    return texts.join(' ');
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

  private extractDuration(description: string): { type: 'instantaneous' | 'until_end_of_turn' | 'until_start_of_turn' | 'time_based' | 'until_removed'; specific?: string } | undefined {
    const lower = description.toLowerCase();
    
    if (lower.includes('until the end of') || lower.includes('end of turn')) {
      return { type: 'until_end_of_turn', specific: 'until end of turn' };
    } else if (lower.includes('until the start of') || lower.includes('start of turn')) {
      return { type: 'until_start_of_turn', specific: 'until start of turn' };
    } else if (lower.includes('for 1 minute') || lower.includes('1 minute') || lower.includes('for 1 hour') || lower.includes('1 hour')) {
      return { type: 'time_based', specific: lower.includes('minute') ? '1 minute' : '1 hour' };
    } else if (lower.includes('until') && (lower.includes('save') || lower.includes('saving throw') || lower.includes('removed'))) {
      return { type: 'until_removed', specific: 'until removed or dispelled' };
    } else if (lower.includes('instantaneous') || lower.includes('immediately')) {
      return { type: 'instantaneous' };
    }
    
    // Try to extract specific time-based duration patterns
    const durationMatch = description.match(/(?:for|lasts?)\s+(\d+\s+\w+)/i);
    if (durationMatch) {
      return { type: 'time_based', specific: durationMatch[1].trim() };
    }
    
    // Default: most conditions last until removed
    return { type: 'until_removed' };
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
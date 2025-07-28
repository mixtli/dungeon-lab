/**
 * Action converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries, validateActionData, ValidationResult } from '../utils/conversion-utils.mjs';
import type { EtoolsAction, EtoolsActionData, EtoolsActionTime } from '../../5etools-types/actions.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { generateSlug } from '@dungeon-lab/shared/utils/index.mjs';
import { transformMonsterEntries } from '../utils/reference-transformer.mjs';
import type { DndActionData } from '../../types/dnd/index.mjs';

export class ActionWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting action wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read action data
      const actionFiles = [
        'actions.json'
      ];

      for (const fileName of actionFiles) {
        try {
          const rawData = await readEtoolsData(fileName);
          const actionData = safeEtoolsCast<EtoolsActionData>(rawData, ['action'], `action data file ${fileName}`);

          // Process actions
          const actions = extractEtoolsArray<EtoolsAction>(actionData, 'action', `action list in ${fileName}`);
          const filteredActions = this.options.srdOnly ? filterSrdContent(actions) : actions;
          
          stats.total += filteredActions.length;
          this.log(`Processing ${filteredActions.length} actions from ${fileName}`);

          for (let i = 0; i < filteredActions.length; i++) {
            const actionRaw = filteredActions[i];
            try {
              const { action, validationResult } = await this.convertAction(actionRaw);
              // Action is already properly typed for wrapper creation

              // Check validation result
              if (!validationResult.success) {
                this.log(`❌ ${actionRaw.name}: ${validationResult.errors?.join(', ') || 'Validation failed'}`);
                stats.errors++;
                continue; // Skip this action and continue with next
              }

              // Log successful validation
              this.log(`✅ ${actionRaw.name}`);

              // Create wrapper format using the full document structure
              const wrapper = this.createWrapper(
                action.name,
                action, // Always use the full structure for proper directory mapping
                'vtt-document',
                {
                  category: this.determineCategory(actionRaw, 'vtt-document'),
                  tags: this.extractTags(actionRaw, 'vtt-document'),
                  sortOrder: this.calculateSortOrder(actionRaw, 'vtt-document') + i
                }
              );
              
              content.push({
                type: 'vtt-document',
                wrapper,
                originalPath: fileName
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`❌ ${actionRaw.name}: ${error instanceof Error ? error.message : 'Conversion error'}`);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file ${fileName}:`, error);
          stats.errors++;
        }
      }

      this.log(`Action wrapper conversion complete. Stats:`, stats);
      
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

  private async convertAction(actionData: EtoolsAction): Promise<{ action: {
    id: string;
    slug: string;
    name: string;
    documentType: 'vtt-document';
    pluginDocumentType: string;
    pluginId: string;
    campaignId: string;
    description: string;
    userData: Record<string, unknown>;
    pluginData: unknown;
  }; validationResult: ValidationResult }> {
    // Transform entries to extract references
    const transformResult = transformMonsterEntries(actionData.entries);
    const description = formatEntries(transformResult.entries);

    // Create action structure matching the clean schema
    const actionDataForValidation = {
      name: actionData.name,
      description,
      source: actionData.source,
      page: actionData.page,
      actionType: this.determineActionType(actionData.time),
      trigger: this.extractTrigger(actionData.time),
      requirements: this.extractRequirements(description),
      effects: this.parseActionEffects(description),
      uses: this.parseActionUses(description)
    };

    // Create full document structure for output
    const action = {
      id: `action-${generateSlug(actionData.name)}`,
      slug: generateSlug(actionData.name),
      name: actionData.name,
      documentType: 'vtt-document' as const, // Correct documentType from schema
      pluginDocumentType: 'action',
      pluginId: 'dnd-5e-2024',
      campaignId: '',
      description,
      userData: {},
      pluginData: actionDataForValidation
    };

    // Validate the simplified action data against the schema
    const validationResult = await validateActionData(actionDataForValidation);

    return { action, validationResult };
  }

  private extractRequirements(description: string): {
    level?: number;
    other?: string;
    equipment?: string[];
    features?: string[];
  } | undefined {
    const requirements: {
      level?: number;
      other?: string;
      equipment?: string[];
      features?: string[];
    } = {};
    
    // Extract level requirements
    const levelMatch = description.match(/(\d+)(?:st|nd|rd|th)[-\s]?level/i);
    if (levelMatch) {
      requirements.level = parseInt(levelMatch[1], 10);
    }
    
    // Extract equipment requirements
    const equipmentMatch = description.match(/requires?\s+(?:a\s+)?([^.]+)/i);
    if (equipmentMatch) {
      requirements.equipment = [equipmentMatch[1].trim()];
    }
    
    return Object.keys(requirements).length > 0 ? requirements : undefined;
  }



  private determineActionType(time?: EtoolsActionTime[]): DndActionData['actionType'] {
    if (!time || time.length === 0) return 'action'; // Default to action
    
    const timeEntry = time[0];
    
    // Handle string entries like "Free"
    if (typeof timeEntry === 'string') {
      if (String(timeEntry).toLowerCase() === 'free') {
        return 'free';
      }
      return 'action'; // Default for unknown strings
    }
    
    // Handle object entries with unit
    if (typeof timeEntry === 'object' && timeEntry.unit) {
      switch (timeEntry.unit) {
        case 'action':
          return 'action';
        case 'bonus':
          return 'bonus_action';
        case 'reaction':
          return 'reaction';
        default:
          return 'action';
      }
    }
    
    return 'action';
  }

  private extractTrigger(time?: EtoolsActionTime[]): string | undefined {
    if (!time || time.length === 0) return undefined;
    
    const timeEntry = time[0];
    if (typeof timeEntry === 'object' && timeEntry.unit === 'reaction' && timeEntry.condition) {
      return timeEntry.condition;
    }
    
    return undefined;
  }

  private parseActionEffects(description: string): DndActionData['effects'] {
    const effects: NonNullable<DndActionData['effects']> = {
      attackRoll: false
    };
    
    // Parse range
    const rangeMatch = description.match(/(\d+)\s*feet?/i);
    if (rangeMatch) {
      effects.range = `${rangeMatch[1]} feet`;
    }
    
    // Parse area of effect
    const aoeMatch = description.match(/(\d+)-foot[- ]?(radius|cube|cylinder|cone|line)/i);
    if (aoeMatch) {
      const size = parseInt(aoeMatch[1], 10);
      const type = aoeMatch[2].toLowerCase();
      
      if (type === 'radius') {
        effects.area = { type: 'sphere', size };
      } else if (['cube', 'cylinder', 'cone', 'line'].includes(type)) {
        effects.area = { type: type as 'cube' | 'cylinder' | 'cone' | 'line', size };
      }
    }
    
    // Parse attack roll
    if (description.toLowerCase().includes('attack roll') || description.toLowerCase().includes('make.*attack')) {
      effects.attackRoll = true;
    }
    
    // Parse saving throw
    const saveMatch = description.match(/DC (\d+) (\w+) saving throw/i);
    if (saveMatch) {
      const dc = parseInt(saveMatch[1], 10);
      const ability = saveMatch[2].toLowerCase();
      
      if (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(ability)) {
        effects.savingThrow = {
          ability: ability as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
          dc
        };
      }
    }
    
    // Parse damage
    const damageMatch = description.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(\w+)\s*damage/i);
    if (damageMatch) {
      effects.damage = {
        dice: damageMatch[1],
        type: damageMatch[2].toLowerCase()
      };
    }
    
    return Object.keys(effects).length > 1 || effects.attackRoll ? effects : undefined;
  }

  private parseActionUses(description: string): DndActionData['uses'] {
    // Look for usage patterns like "once per turn", "once per short rest", etc.
    const usageMatch = description.match(/(?:once|(\d+)\s*times?)\s*per\s*(turn|round|short\s*rest|long\s*rest|day)/i);
    if (usageMatch) {
      const value = usageMatch[1] ? parseInt(usageMatch[1], 10) : 1;
      const per = usageMatch[2].toLowerCase().replace(/\s+/g, ' ');
      
      // Map different formats to schema values
      let restType: 'turn' | 'round' | 'short rest' | 'long rest' | 'day';
      switch (per) {
        case 'turn':
          restType = 'turn';
          break;
        case 'round':
          restType = 'round';
          break;
        case 'short rest':
          restType = 'short rest';
          break;
        case 'long rest':
          restType = 'long rest';
          break;
        case 'day':
          restType = 'day';
          break;
        default:
          return undefined;
      }
      
      return { value, per: restType };
    }
    
    return undefined;
  }

}
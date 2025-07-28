/**
 * Type-safe action converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Comprehensive action data extraction with requirements, effects, and usage
 */

import { TypedConverter } from './typed-converter.mjs';
import { 
  type ActionDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsAction, EtoolsActionData, EtoolsActionTime } from '../../5etools-types/actions.mjs';
import { etoolsActionSchema } from '../../5etools-types/actions.mjs';
import { 
  dndActionDataSchema, 
  type DndActionData
} from '../../types/dnd/action.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// ActionDocument type is now imported from the validators file

/**
 * Typed action converter using the new pipeline
 */
export class TypedActionConverter extends TypedConverter<
  typeof etoolsActionSchema,
  typeof dndActionDataSchema,
  ActionDocument
> {

  protected getInputSchema() {
    return etoolsActionSchema;
  }

  protected getOutputSchema() {
    return dndActionDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'action';
  }

  protected extractDescription(input: EtoolsAction): string {
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `${input.name} is a special action.`;
  }

  protected extractAssetPath(input: EtoolsAction): string | undefined {
    // Actions typically don't have associated images
    return undefined;
  }

  protected transformData(input: EtoolsAction): DndActionData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page,
      
      // Extract action type from timing information
      actionType: this.determineActionType(input.time),
      
      // Extract trigger for reactions
      trigger: this.extractTrigger(input.time),
      
      // Extract requirements from description and entries
      requirements: this.extractRequirements(input, description),
      
      // Extract mechanical effects
      effects: this.extractEffects(input, description),
      
      // Extract usage limitations
      uses: this.extractUses(input, description)
    };
  }

  /**
   * Convert array of actions from the actions.json file
   */
  public async convertActions(): Promise<{
    success: boolean;
    results: ActionDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed action conversion...');
      
      const results: ActionDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Process actions.json file
      const filename = 'actions.json';
      
      try {
        const rawData = await this.readEtoolsData(filename);
        const actionData = safeEtoolsCast<EtoolsActionData>(rawData, ['action'], `action data file ${filename}`);
        
        if (!actionData.action?.length) {
          this.log(`No actions found in ${filename}`);
          return {
            success: true,
            results: [],
            errors: [],
            stats: { total: 0, converted: 0, errors: 0 }
          };
        }

        const filteredActions = this.filterSrdContent(actionData.action);
        total += filteredActions.length;
        
        this.log(`Processing ${filteredActions.length} actions from ${filename}`);

        for (const action of filteredActions) {
          const result = await this.convertItem(action);
          
          if (result.success && result.document) {
            results.push(result.document);
            converted++;
            this.log(`✅ Action ${action.name} converted successfully`);
          } else {
            errors.push(`Failed to convert action ${action.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
            this.log(`❌ Action ${action.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
          }
        }
      } catch (fileError) {
        const errorMsg = `Failed to process ${filename}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        this.log(errorMsg);
      }
      
      this.log(`Typed action conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Action conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  // Helper methods for extracting action-specific data

  private determineActionType(time?: (EtoolsActionTime | string)[]): DndActionData['actionType'] {
    if (!time || time.length === 0) return 'action'; // Default to action
    
    const timeEntry = time[0];
    
    // Handle string entries like "Free"
    if (typeof timeEntry === 'string') {
      const timeStr = timeEntry.toLowerCase();
      if (timeStr === 'free') {
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
        case 'minute':
        case 'hour':
          return 'other'; // For long-term actions
        case 'round':
          return 'action'; // Treat round as action
        default:
          return 'action';
      }
    }
    
    return 'action';
  }

  private extractTrigger(time?: (EtoolsActionTime | string)[]): string | undefined {
    if (!time || time.length === 0) return undefined;
    
    const timeEntry = time[0];
    if (typeof timeEntry === 'object' && timeEntry.unit === 'reaction' && timeEntry.condition) {
      return timeEntry.condition;
    }
    
    return undefined;
  }

  private extractRequirements(input: EtoolsAction, description: string): DndActionData['requirements'] {
    const requirements: NonNullable<DndActionData['requirements']> = {};
    const desc = description.toLowerCase();
    
    // Extract level requirements
    const levelMatch = desc.match(/(\d+)(?:st|nd|rd|th)[-\s]?level/i);
    if (levelMatch) {
      requirements.level = parseInt(levelMatch[1], 10);
    }
    
    // Extract feature requirements
    const features: string[] = [];
    if (desc.includes('rage') || desc.includes('barbarian')) {
      features.push('Rage');
    }
    if (desc.includes('ki') || desc.includes('monk')) {
      features.push('Ki');
    }
    if (desc.includes('spell slot') || desc.includes('spellcasting')) {
      features.push('Spellcasting');
    }
    if (desc.includes('channel divinity')) {
      features.push('Channel Divinity');
    }
    if (desc.includes('action surge')) {
      features.push('Action Surge');
    }
    
    if (features.length > 0) {
      requirements.features = features;
    }
    
    // Extract equipment requirements
    const equipment: string[] = [];
    if (desc.includes('weapon') && !desc.includes('unarmed')) {
      equipment.push('weapon');
    }
    if (desc.includes('shield')) {
      equipment.push('shield');
    }
    if (desc.includes('ammunition')) {
      equipment.push('ammunition');
    }
    
    if (equipment.length > 0) {
      requirements.equipment = equipment;
    }
    
    return Object.keys(requirements).length > 0 ? requirements : undefined;
  }

  private extractEffects(input: EtoolsAction, description: string): DndActionData['effects'] {
    const effects: NonNullable<DndActionData['effects']> = {
      attackRoll: false
    };
    const desc = description.toLowerCase();
    
    // Parse range
    const rangeMatch = desc.match(/(?:range|reach)\s*(?:of\s*)?(\d+)\s*feet?/i);
    if (rangeMatch) {
      effects.range = `${rangeMatch[1]} feet`;
    }
    
    // Parse area of effect
    const aoeMatch = desc.match(/(\d+)-foot[- ]?(radius|cube|cylinder|cone|line|sphere)/i);
    if (aoeMatch) {
      const size = parseInt(aoeMatch[1], 10);
      const type = aoeMatch[2].toLowerCase();
      
      if (type === 'radius' || type === 'sphere') {
        effects.area = { type: 'sphere', size };
      } else if (['cube', 'cylinder', 'cone', 'line'].includes(type)) {
        effects.area = { type: type as 'cube' | 'cylinder' | 'cone' | 'line', size };
      }
    }
    
    // Parse attack roll
    if (desc.includes('attack roll') || desc.includes('make.*attack') || desc.includes('melee.*attack') || desc.includes('ranged.*attack')) {
      effects.attackRoll = true;
    }
    
    // Parse saving throw
    const saveMatch = desc.match(/dc (\d+) (\w+) saving throw/i);
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
    const damageMatch = desc.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(\w+)\s*damage/i);
    if (damageMatch) {
      effects.damage = {
        dice: damageMatch[1].replace(/\s+/g, ''),
        type: damageMatch[2].toLowerCase()
      };
    }
    
    return Object.keys(effects).length > 1 || effects.attackRoll ? effects : undefined;
  }

  private extractUses(input: EtoolsAction, description: string): DndActionData['uses'] {
    const desc = description.toLowerCase();
    
    // Look for usage patterns like "once per turn", "once per short rest", etc.
    const usageMatch = desc.match(/(?:once|(\d+)\s*times?)\s*per\s*(turn|round|short\s*rest|long\s*rest|day)/i);
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
    
    // Check for specific class feature limitations
    if (desc.includes('rage') && desc.includes('while raging')) {
      return { value: 1, per: 'turn' };
    }
    
    if (desc.includes('ki point')) {
      return { value: 1, per: 'turn' };
    }
    
    return undefined;
  }
}
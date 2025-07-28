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
                this.log(`❌ Action ${actionRaw.name} failed validation:`, validationResult.errors);
                stats.errors++;
                continue; // Skip this action and continue with next
              }

              // Log successful validation
              this.log(`✅ Action ${actionRaw.name} validated successfully`);

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
              this.log(`Error converting action ${actionRaw.name}:`, error);
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

    // Create simplified action structure for validation
    const timeCost = this.parseTimeCost(actionData.time);
    const actionDataForValidation = {
      name: actionData.name,
      description,
      source: actionData.source,
      page: actionData.page,
      actionType: this.determineActionType(timeCost),
      timeCost, // Keep as undefined if missing
      requirements: this.extractRequirements(description),
      mechanics: this.parseActionMechanicsForSchema(description),
      variants: this.extractActionVariantsForSchema(description),
      tags: this.parseActionTagsForSchema(actionData.name, description),
      relatedActions: this.extractRelatedActions(description)
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

  private parseActionMechanicsForSchema(description: string): {
    damage?: { type: string; dice: string; };
    range?: number;
    areaOfEffect?: { type: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'line'; size: number; };
    savingThrow?: { ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'; dc?: number; };
    attackRoll?: boolean;
  } | undefined {
    const mechanics: {
      damage?: { type: string; dice: string; };
      range?: number;
      areaOfEffect?: { type: 'sphere' | 'cube' | 'cylinder' | 'cone' | 'line'; size: number; };
      savingThrow?: { ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'; dc?: number; };
      attackRoll?: boolean;
    } = {};
    
    // Parse range
    const rangeMatch = description.match(/(\d+)\s*feet?/i);
    if (rangeMatch) {
      mechanics.range = parseInt(rangeMatch[1], 10);
    }
    
    // Parse area of effect
    const aoeMatch = description.match(/(\d+)-foot[- ]?(radius|cube|cylinder|cone|line)/i);
    if (aoeMatch) {
      const size = parseInt(aoeMatch[1], 10);
      const type = aoeMatch[2].toLowerCase();
      
      if (type === 'radius') {
        mechanics.areaOfEffect = { type: 'sphere', size };
      } else if (['cube', 'cylinder', 'cone', 'line'].includes(type)) {
        mechanics.areaOfEffect = { type: type as 'cube' | 'cylinder' | 'cone' | 'line', size };
      }
    }
    
    // Parse saving throw
    const saveMatch = description.match(/DC (\d+) (\w+) saving throw/i);
    if (saveMatch) {
      const dc = parseInt(saveMatch[1], 10);
      const ability = saveMatch[2].toLowerCase();
      
      if (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(ability)) {
        mechanics.savingThrow = {
          ability: ability as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
          dc
        };
      }
    }
    
    // Parse attack roll
    if (description.toLowerCase().includes('attack roll') || description.toLowerCase().includes('make.*attack')) {
      mechanics.attackRoll = true;
    }
    
    // Parse damage
    const damageMatch = description.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(\w+)\s*damage/i);
    if (damageMatch) {
      mechanics.damage = {
        dice: damageMatch[1],
        type: damageMatch[2].toLowerCase()
      };
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  private extractActionVariantsForSchema(description: string): Array<{
    name: string;
    description: string;
    requirements?: string;
  }> | undefined {
    // This is a simplified implementation
    const variants: Array<{
      name: string;
      description: string;
      requirements?: string;
    }> = [];
    
    if (description.includes('alternative') || description.includes('variant') || description.includes('instead')) {
      variants.push({
        name: 'Alternative Use',
        description: 'This action can be used in alternative ways as described in the full text.'
      });
    }
    
    return variants.length > 0 ? variants : undefined;
  }

  private parseActionTagsForSchema(name: string, description: string): Array<'magic' | 'movement' | 'combat' | 'exploration' | 'social' | 'utility' | 'defensive' | 'offensive' | 'healing'> | undefined {
    const tags: Array<'magic' | 'movement' | 'combat' | 'exploration' | 'social' | 'utility' | 'defensive' | 'offensive' | 'healing'> = [];
    
    const nameDesc = (name + ' ' + description).toLowerCase();
    
    if (nameDesc.includes('attack') || nameDesc.includes('damage')) {
      tags.push('offensive');
    }
    if (nameDesc.includes('heal') || nameDesc.includes('restore')) {
      tags.push('healing');
    }
    if (nameDesc.includes('move') || nameDesc.includes('speed') || nameDesc.includes('dash')) {
      tags.push('movement');
    }
    if (nameDesc.includes('dodge') || nameDesc.includes('defend') || nameDesc.includes('protection')) {
      tags.push('defensive');
    }
    if (nameDesc.includes('spell') || nameDesc.includes('magic')) {
      tags.push('magic');
    }
    if (nameDesc.includes('help') || nameDesc.includes('aid') || nameDesc.includes('assist')) {
      tags.push('utility');
    }
    if (nameDesc.includes('search') || nameDesc.includes('investigate') || nameDesc.includes('perception')) {
      tags.push('exploration');
    }
    if (nameDesc.includes('persuasion') || nameDesc.includes('deception') || nameDesc.includes('intimidation')) {
      tags.push('social');
    }
    
    // Default to combat if in doubt and involves actions/attacks
    if (tags.length === 0 && (nameDesc.includes('action') || nameDesc.includes('turn'))) {
      tags.push('combat');
    }
    
    return tags.length > 0 ? tags : undefined;
  }

  private parseTimeCost(time?: EtoolsActionTime[]): {
    number: number;
    unit: 'action' | 'bonus_action' | 'reaction' | 'minute' | 'hour' | 'round';
  } | undefined {
    if (!time || time.length === 0) return undefined;
    
    const timeEntry = time[0];
    
    // Handle string entries like "Free"
    if (typeof timeEntry === 'string') {
      if (String(timeEntry).toLowerCase() === 'free') {
        return undefined; // Free actions don't have a time cost
      }
      return undefined; // Unknown string format
    }
    
    // Handle object entries with number and unit
    if (typeof timeEntry === 'object' && timeEntry.number && timeEntry.unit) {
      // Convert 5etools 'bonus' to our 'bonus_action'
      const unit = timeEntry.unit === 'bonus' ? 'bonus_action' as const : timeEntry.unit;
      return {
        number: timeEntry.number,
        unit
      };
    }
    
    return undefined;
  }

  private determineActionType(timeCost?: DndActionData['timeCost']): DndActionData['actionType'] {
    if (!timeCost) return undefined;
    
    switch (timeCost.unit) {
      case 'action':
        return 'action';
      case 'bonus_action':
        return 'bonus_action';
      case 'reaction':
        return 'reaction';
      default:
        return undefined;
    }
  }

  // @ts-expect-error - Future functionality, currently unused
  private parseActionMechanics(description: string): DndActionData['mechanics'] {
    const mechanics: NonNullable<DndActionData['mechanics']> = {};
    
    // Parse range
    const rangeMatch = description.match(/(\d+)\s*feet?/i);
    if (rangeMatch) {
      mechanics.range = parseInt(rangeMatch[1], 10);
    }
    
    // Parse area of effect
    const aoeMatch = description.match(/(\d+)-foot[- ]?(radius|cube|cylinder|cone|line)/i);
    if (aoeMatch) {
      const size = parseInt(aoeMatch[1], 10);
      const type = aoeMatch[2].toLowerCase();
      
      if (type === 'radius') {
        mechanics.areaOfEffect = { type: 'sphere', size };
      } else if (['cube', 'cylinder', 'cone', 'line'].includes(type)) {
        mechanics.areaOfEffect = { type: type as 'cube' | 'cylinder' | 'cone' | 'line', size };
      }
    }
    
    // Parse saving throw
    const saveMatch = description.match(/DC (\d+) (\w+) saving throw/i);
    if (saveMatch) {
      const dc = parseInt(saveMatch[1], 10);
      const ability = saveMatch[2].toLowerCase();
      
      if (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(ability)) {
        mechanics.savingThrow = {
          ability: ability as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
          dc
        };
      }
    }
    
    // Parse attack roll
    if (description.toLowerCase().includes('attack roll') || description.toLowerCase().includes('make.*attack')) {
      mechanics.attackRoll = true;
    }
    
    // Parse damage
    const damageMatch = description.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(\w+)\s*damage/i);
    if (damageMatch) {
      mechanics.damage = {
        dice: damageMatch[1],
        type: damageMatch[2].toLowerCase()
      };
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  // @ts-expect-error - Future functionality, currently unused
  private parseActionTags(name: string, description: string): DndActionData['tags'] {
    const tags: NonNullable<DndActionData['tags']> = [];
    
    // Determine tags based on name and description
    const nameDesc = (name + ' ' + description).toLowerCase();
    
    if (nameDesc.includes('attack') || nameDesc.includes('damage')) {
      tags.push('offensive');
    }
    if (nameDesc.includes('heal') || nameDesc.includes('restore')) {
      tags.push('healing');
    }
    if (nameDesc.includes('move') || nameDesc.includes('speed') || nameDesc.includes('dash')) {
      tags.push('movement');
    }
    if (nameDesc.includes('dodge') || nameDesc.includes('defend') || nameDesc.includes('protection')) {
      tags.push('defensive');
    }
    if (nameDesc.includes('spell') || nameDesc.includes('magic')) {
      tags.push('magic');
    }
    if (nameDesc.includes('help') || nameDesc.includes('aid') || nameDesc.includes('assist')) {
      tags.push('utility');
    }
    if (nameDesc.includes('search') || nameDesc.includes('investigate') || nameDesc.includes('perception')) {
      tags.push('exploration');
    }
    if (nameDesc.includes('persuasion') || nameDesc.includes('deception') || nameDesc.includes('intimidation')) {
      tags.push('social');
    }
    
    // Default to combat if in doubt and involves actions/attacks
    if (tags.length === 0 && (nameDesc.includes('action') || nameDesc.includes('turn'))) {
      tags.push('combat');
    }
    
    return tags.length > 0 ? tags : undefined;
  }

  // @ts-expect-error - Future functionality, currently unused
  private extractActionVariants(description: string): DndActionData['variants'] {
    // Look for sections that describe variants or special uses
    const variants: NonNullable<DndActionData['variants']> = [];
    
    // This is a simplified implementation - real parsing would be more sophisticated
    if (description.includes('alternative') || description.includes('variant') || description.includes('instead')) {
      // Could parse out specific variant rules here
    }
    
    return variants.length > 0 ? variants : undefined;
  }

  private extractRelatedActions(description: string): string[] | undefined {
    const actions = ['attack', 'dash', 'dodge', 'help', 'hide', 'ready', 'search', 'disengage', 'study', 'utilize'];
    
    const found = actions.filter(action => 
      description.toLowerCase().includes(action) && 
      !description.toLowerCase().startsWith(action)
    );
    
    return found.length > 0 ? found : undefined;
  }
}
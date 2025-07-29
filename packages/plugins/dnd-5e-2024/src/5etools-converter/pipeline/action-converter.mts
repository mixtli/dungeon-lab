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

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type ActionDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsActionData } from '../../5etools-types/actions.mjs';
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

  protected extractDescription(input: z.infer<typeof etoolsActionSchema>): string {
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `${input.name} is a special action.`;
  }

  protected extractAssetPath(_input: z.infer<typeof etoolsActionSchema>): string | undefined {
    // Actions typically don't have associated images
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsActionSchema>): DndActionData {
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
      
      // Preserve original timing data from 5etools
      time: input.time,
      
      // Extract requirements from description and entries
      requirements: this.extractRequirements(input, description),
      
      // NOTE: Effects are not extracted from text due to unreliable parsing.
      // The finite set of actions (~15) should have effects manually curated.
      // effects: undefined,
      
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

  private determineActionType(time?: unknown[]): DndActionData['actionType'] {
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
    if (typeof timeEntry === 'object' && timeEntry && 'unit' in timeEntry) {
      const timeObj = timeEntry as { unit: string };
      switch (timeObj.unit) {
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

  private extractTrigger(time?: unknown[]): string | undefined {
    if (!time || time.length === 0) return undefined;
    
    const timeEntry = time[0];
    if (typeof timeEntry === 'object' && timeEntry && 'unit' in timeEntry && 'condition' in timeEntry) {
      const timeObj = timeEntry as { unit: string; condition?: string };
      if (timeObj.unit === 'reaction' && timeObj.condition) {
        return timeObj.condition;
      }
    }
    
    return undefined;
  }

  private extractRequirements(input: z.infer<typeof etoolsActionSchema>, description: string): DndActionData['requirements'] {
    const requirements: NonNullable<DndActionData['requirements']> = {};
    const desc = description.toLowerCase();
    
    // Extract level requirements
    const levelMatch = desc.match(/(\d+)(?:st|nd|rd|th)[-\s]?level/i);
    if (levelMatch) {
      requirements.level = parseInt(levelMatch[1], 10);
    }
    
    // Extract feature requirements
    // NOTE: Removed unreliable text matching for class features like Ki, Rage, etc.
    // These should be determined from structured class feature data, not text parsing.
    // Actions in actions.json are general actions, not class-specific actions.
    const features: string[] = [];
    
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

  /**
   * NOTE: Effects extraction removed due to unreliable text parsing.
   * 
   * MANUAL EFFECTS CURATION APPROACH:
   * 
   * The effects field should be manually populated for the finite set of general actions (~15)
   * because automated extraction from description text is unreliable:
   * 
   * Problems with automated extraction:
   * - False positives: "Hide" action got attackRoll: true because description mentions "attack"
   * - False negatives: "Attack" action might miss attackRoll due to varied phrasing
   * - Context dependency: Real effects depend on character stats, equipment, level
   * - Complex parsing: Damage, saves, ranges have many textual representations
   * 
   * Recommended approach:
   * 1. Leave effects undefined in converter (current state)
   * 2. Manually curate effects for each action in a separate data file or database updates
   * 3. Use game knowledge to set accurate mechanical effects
   * 4. Consider character context when defining effects (e.g., attack bonus calculation)
   * 
   * This ensures high accuracy for the small, manageable set of general actions.
   */

  private extractUses(input: z.infer<typeof etoolsActionSchema>, description: string): DndActionData['uses'] {
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
    
    // NOTE: Removed unreliable text matching for class feature limitations
    // These should be determined from structured class feature data, not text parsing
    
    return undefined;
  }
}
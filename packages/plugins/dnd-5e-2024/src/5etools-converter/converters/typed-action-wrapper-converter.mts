/**
 * Type-safe action wrapper converter
 * 
 * Bridges the enhanced typed action pipeline with the existing wrapper system
 * for compendium generation. Handles action documents and provides complete
 * validation while maintaining compatibility with the current compendium format.
 */

import { TypedActionConverter } from '../pipeline/typed-action-converter.mjs';
import type { ActionDocument } from '../validation/typed-document-validators.mjs';
import type { WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import type { ConversionOptions } from '../pipeline/typed-converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Wrapper converter that bridges typed action converter with compendium format
 */
export class TypedActionWrapperConverter {
  private readonly typedConverter: TypedActionConverter;

  constructor(options: ConversionOptions = {}) {
    this.typedConverter = new TypedActionConverter(options);
  }

  /**
   * Convert all actions using the typed pipeline
   */
  async convert(): Promise<WrapperConversionResult> {
    try {
      console.log('[TypedActionWrapperConverter] Starting action conversion...');
      const result = await this.typedConverter.convertActions();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: { total: result.stats.total, converted: 0, skipped: 0, errors: result.stats.errors }
        };
      }

      const wrapperContent: WrapperContent[] = [];
      
      // Convert each action document to wrapper format
      for (const actionDoc of result.results) {
        const wrapper = this.createActionWrapper(actionDoc);
        wrapperContent.push({ type: 'vtt-document', wrapper });
      }

      console.log(`[TypedActionWrapperConverter] Converted ${result.results.length} actions`);
      
      return {
        success: true,
        content: wrapperContent,
        stats: {
          total: result.stats.total,
          converted: result.stats.converted,
          skipped: result.stats.total - result.stats.converted,
          errors: result.stats.errors
        }
      };
    } catch (error) {
      const errorMessage = `Action wrapper conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TypedActionWrapperConverter] ${errorMessage}`);
      
      return {
        success: false,
        error: new Error(errorMessage),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper for an action document
   */
  private createActionWrapper(actionDoc: ActionDocument): IContentFileWrapper {
    // Determine category based on action type and properties
    const category = this.determineActionCategory(actionDoc);
    
    // Extract tags based on action properties
    const tags = this.extractActionTags(actionDoc);
    
    return {
      entry: {
        name: actionDoc.name,
        type: 'vtt-document',
        imageId: actionDoc.imageId,
        category,
        tags,
        sortOrder: this.calculateSortOrder(actionDoc)
      },
      content: actionDoc
    };
  }

  /**
   * Determine action category for wrapper based on type and properties
   */
  private determineActionCategory(actionDoc: ActionDocument): string {
    const pluginData = actionDoc.pluginData;
    
    // Categorize by action type first
    switch (pluginData.actionType) {
      case 'action':
        return this.getCombatActionCategory(actionDoc);
      case 'bonus_action':
        return 'Bonus Actions';
      case 'reaction':
        return 'Reactions';
      case 'free':
        return 'Free Actions';
      case 'other':
        return 'Special Actions';
      default:
        return 'Combat Actions';
    }
  }

  /**
   * Get specific category for combat actions
   */
  private getCombatActionCategory(actionDoc: ActionDocument): string {
    const pluginData = actionDoc.pluginData;
    const name = pluginData.name.toLowerCase();
    
    // Basic combat actions
    if (name.includes('attack') || name.includes('strike')) {
      return 'Attack Actions';
    }
    
    if (name.includes('grapple') || name.includes('shove') || name.includes('trip')) {
      return 'Grappling Actions';
    }
    
    if (name.includes('dodge') || name.includes('disengage') || name.includes('dash')) {
      return 'Movement Actions';
    }
    
    if (name.includes('help') || name.includes('ready') || name.includes('search')) {
      return 'Utility Actions';
    }
    
    if (name.includes('cast') || name.includes('spell')) {
      return 'Spellcasting Actions';
    }
    
    if (name.includes('hide') || name.includes('stealth')) {
      return 'Stealth Actions';
    }
    
    // Check if it's a class-specific action
    if (pluginData.requirements?.features?.length) {
      return 'Class Features';
    }
    
    // Check if it has attack mechanics
    if (pluginData.effects?.attackRoll) {
      return 'Attack Actions';
    }
    
    // Check if it has spell-like effects
    if (pluginData.effects?.savingThrow || pluginData.effects?.damage) {
      return 'Special Abilities';
    }
    
    return 'Combat Actions';
  }

  /**
   * Extract tags from action document
   */
  private extractActionTags(actionDoc: ActionDocument): string[] {
    const tags: string[] = [];
    const pluginData = actionDoc.pluginData;
    const name = pluginData.name.toLowerCase();
    
    // Add action type tag
    tags.push(pluginData.actionType.replace('_', '-'));
    
    // Add combat role tags
    if (pluginData.effects?.attackRoll) {
      tags.push('attack');
    }
    
    if (pluginData.effects?.damage) {
      tags.push('damage');
      if (pluginData.effects.damage.type) {
        tags.push(`${pluginData.effects.damage.type}-damage`);
      }
    }
    
    if (pluginData.effects?.savingThrow) {
      tags.push('saving-throw');
      tags.push(`${pluginData.effects.savingThrow.ability}-save`);
    }
    
    if (pluginData.effects?.area) {
      tags.push('area-effect');
      tags.push(`${pluginData.effects.area.type}-area`);
    }
    
    // Add range tags
    if (pluginData.effects?.range) {
      const range = pluginData.effects.range.toLowerCase();
      if (range.includes('5')) {
        tags.push('melee');
      } else if (range.includes('30') || range.includes('60')) {
        tags.push('ranged');
      } else if (range.includes('120') || range.includes('150')) {
        tags.push('long-range');
      }
    }
    
    // Add requirement tags
    if (pluginData.requirements?.level) {
      const level = pluginData.requirements.level;
      if (level <= 5) {
        tags.push('low-level');
      } else if (level <= 10) {
        tags.push('mid-level');
      } else {
        tags.push('high-level');
      }
    }
    
    if (pluginData.requirements?.features?.length) {
      pluginData.requirements.features.forEach(feature => {
        tags.push(feature.toLowerCase().replace(/\s+/g, '-'));
      });
    }
    
    if (pluginData.requirements?.equipment?.length) {
      pluginData.requirements.equipment.forEach(equipment => {
        tags.push(`requires-${equipment.toLowerCase()}`);
      });
    }
    
    // Add usage limitation tags
    if (pluginData.uses) {
      tags.push('limited-use');
      tags.push(`per-${pluginData.uses.per.replace(/\s+/g, '-')}`);
      
      if (pluginData.uses.value === 1) {
        tags.push('once-per-' + pluginData.uses.per.replace(/\s+/g, '-'));
      }
    }
    
    // Add source tag if available
    if (pluginData.source) {
      tags.push(pluginData.source.toLowerCase());
    }
    
    // Add specific action tags
    if (name.includes('dash')) {
      tags.push('movement');
    }
    if (name.includes('dodge')) {
      tags.push('defense');
    }
    if (name.includes('help')) {
      tags.push('support');
    }
    if (name.includes('hide')) {
      tags.push('stealth');
    }
    if (name.includes('ready')) {
      tags.push('tactical');
    }
    if (name.includes('search')) {
      tags.push('investigation');
    }
    if (name.includes('grapple') || name.includes('shove')) {
      tags.push('grappling');
    }
    
    // Reaction-specific tags
    if (pluginData.actionType === 'reaction' && pluginData.trigger) {
      tags.push('triggered');
      if (pluginData.trigger.toLowerCase().includes('damage')) {
        tags.push('defensive-reaction');
      }
      if (pluginData.trigger.toLowerCase().includes('attack')) {
        tags.push('combat-reaction');
      }
    }
    
    return tags;
  }

  /**
   * Calculate sort order for action based on type, usage, and name
   */
  private calculateSortOrder(actionDoc: ActionDocument): number {
    const pluginData = actionDoc.pluginData;
    let baseSortOrder = 0;
    
    // Primary sort by action type (most common first)
    switch (pluginData.actionType) {
      case 'action':
        baseSortOrder = 1000;
        break;
      case 'bonus_action':
        baseSortOrder = 2000;
        break;
      case 'reaction':
        baseSortOrder = 3000;
        break;
      case 'free':
        baseSortOrder = 4000;
        break;
      case 'other':
        baseSortOrder = 5000;
        break;
      default:
        baseSortOrder = 6000;
        break;
    }
    
    // Secondary sort by usage frequency (unlimited use first)
    if (!pluginData.uses) {
      // No usage limit - most accessible
      baseSortOrder += 0;
    } else {
      // Has usage limitations
      switch (pluginData.uses.per) {
        case 'turn':
        case 'round':
          baseSortOrder += 100; // Most frequent limited use
          break;
        case 'short rest':
          baseSortOrder += 200;
          break;
        case 'long rest':
          baseSortOrder += 300;
          break;
        case 'day':
          baseSortOrder += 400; // Least frequent
          break;
        default:
          baseSortOrder += 500;
          break;
      }
    }
    
    // Tertiary sort by complexity (simpler actions first)
    if (pluginData.effects?.attackRoll && !pluginData.effects.savingThrow) {
      baseSortOrder += 10; // Simple attacks
    } else if (pluginData.effects?.savingThrow) {
      baseSortOrder += 20; // Save-based effects
    } else if (pluginData.effects?.area) {
      baseSortOrder += 30; // Area effects
    }
    
    // Quaternary sort by alphabetical order (simplified)
    const nameOffset = Math.min(pluginData.name.charCodeAt(0) - 65, 25); // A=0, B=1, etc., capped at Z
    return baseSortOrder + nameOffset;
  }
}
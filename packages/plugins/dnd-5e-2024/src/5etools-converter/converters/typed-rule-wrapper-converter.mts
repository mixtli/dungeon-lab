/**
 * Type-safe rule wrapper converter
 * 
 * Bridges the enhanced typed rule pipeline with the existing wrapper system
 * for compendium generation. Handles rule documents and provides complete
 * validation while maintaining compatibility with the current compendium format.
 */

import { TypedRuleConverter } from '../pipeline/typed-rule-converter.mjs';
import type { RuleDocument } from '../validation/typed-document-validators.mjs';
import type { WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import type { ConversionOptions } from '../pipeline/typed-converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Wrapper converter that bridges typed rule converter with compendium format
 */
export class TypedRuleWrapperConverter {
  private readonly typedConverter: TypedRuleConverter;

  constructor(options: ConversionOptions = {}) {
    this.typedConverter = new TypedRuleConverter(options);
  }

  /**
   * Convert all rules using the typed pipeline
   */
  async convert(): Promise<WrapperConversionResult> {
    try {
      console.log('[TypedRuleWrapperConverter] Starting rule conversion...');
      const result = await this.typedConverter.convertRules();
      
      if (!result.success) {
        return {
          success: false,
          error: new Error(`Typed conversion failed: ${result.errors.join(', ')}`),
          stats: { total: result.stats.total, converted: 0, skipped: 0, errors: result.stats.errors }
        };
      }

      const wrapperContent: WrapperContent[] = [];
      
      // Convert each rule document to wrapper format
      for (const ruleDoc of result.results) {
        const wrapper = this.createRuleWrapper(ruleDoc);
        wrapperContent.push({ type: 'vtt-document', wrapper });
      }

      console.log(`[TypedRuleWrapperConverter] Converted ${result.results.length} rules`);
      
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
      const errorMessage = `Rule wrapper conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TypedRuleWrapperConverter] ${errorMessage}`);
      
      return {
        success: false,
        error: new Error(errorMessage),
        stats: { total: 0, converted: 0, skipped: 0, errors: 1 }
      };
    }
  }

  /**
   * Create wrapper for a rule document
   */
  private createRuleWrapper(ruleDoc: RuleDocument): IContentFileWrapper {
    // Determine category based on rule type and content
    const category = this.determineRuleCategory(ruleDoc);
    
    // Extract tags based on rule properties
    const tags = this.extractRuleTags(ruleDoc);
    
    return {
      entry: {
        name: ruleDoc.name,
        type: 'vtt-document',
        imageId: ruleDoc.imageId,
        category,
        tags,
        sortOrder: this.calculateSortOrder(ruleDoc)
      },
      content: ruleDoc
    };
  }

  /**
   * Determine rule category for wrapper based on type and properties
   */
  private determineRuleCategory(ruleDoc: RuleDocument): string {
    const pluginData = ruleDoc.pluginData;
    
    // Use the parsed category if available
    if (pluginData.category) {
      switch (pluginData.category) {
        case 'combat':
          return 'Combat Rules';
        case 'exploration':
          return 'Exploration Rules';
        case 'social':
          return 'Social Rules';
        case 'magic':
          return 'Magic Rules';
        case 'equipment':
          return 'Equipment Rules';
        case 'character_creation':
          return 'Character Creation';
        case 'advancement':
          return 'Advancement Rules';
        case 'conditions':
          return 'Condition Rules';
        case 'environment':
          return 'Environment Rules';
        case 'downtime':
          return 'Downtime Rules';
        case 'variant_rules':
          return 'Variant Rules';
        case 'optional_rules':
          return 'Optional Rules';
        case 'dm_tools':
          return 'DM Tools';
        case 'definitions':
          return 'Rule Definitions';
        default:
          return 'General Rules';
      }
    }
    
    // Fall back to rule type categorization
    switch (pluginData.ruleType) {
      case 'core':
        return 'Core Rules';
      case 'optional':
        return 'Optional Rules';
      case 'variant':
        return 'Variant Rules';
      case 'variant_optional':
        return 'Variant Optional Rules';
      default:
        return 'General Rules';
    }
  }

  /**
   * Extract tags from rule document
   */
  private extractRuleTags(ruleDoc: RuleDocument): string[] {
    const tags: string[] = [];
    const pluginData = ruleDoc.pluginData;
    
    // Add rule type tag
    tags.push(pluginData.ruleType);
    
    // Add category tag if available
    if (pluginData.category) {
      tags.push(pluginData.category.replace('_', '-'));
    }
    
    // Add basic rule tag
    if (pluginData.isBasicRule) {
      tags.push('basic-rules');
    }
    
    // Add complexity tag
    if (pluginData.mechanics?.complexity) {
      tags.push(`${pluginData.mechanics.complexity}-complexity`);
    }
    
    // Add mechanics tags
    if (pluginData.mechanics?.modifiesCoreMechanics) {
      tags.push('modifies-core');
    }
    
    if (pluginData.mechanics?.affects?.length) {
      pluginData.mechanics.affects.forEach(affect => {
        tags.push(`affects-${affect.replace('_', '-')}`);
      });
    }
    
    // Add source tag if available
    if (pluginData.source) {
      tags.push(pluginData.source.toLowerCase());
    }
    
    // Add content-based tags
    const description = pluginData.description.toLowerCase();
    if (description.includes('advantage')) {
      tags.push('advantage-disadvantage');
    }
    if (description.includes('proficiency')) {
      tags.push('proficiency');
    }
    if (description.includes('critical')) {
      tags.push('critical-hits');
    }
    if (description.includes('multiclass')) {
      tags.push('multiclassing');
    }
    if (description.includes('feat')) {
      tags.push('feats');
    }
    
    // Add prerequisite tags
    if (pluginData.prerequisites?.dmApproval) {
      tags.push('requires-dm-approval');
    }
    
    if (pluginData.prerequisites?.level) {
      const level = pluginData.prerequisites.level;
      if (level <= 5) {
        tags.push('low-level');
      } else if (level <= 10) {
        tags.push('mid-level');
      } else {
        tags.push('high-level');
      }
    }
    
    // Add subsection tag if rule has subsections
    if (pluginData.subsections?.length) {
      tags.push('detailed-rule');
    }
    
    // Add example tag if rule has examples
    if (pluginData.examples?.length) {
      tags.push('has-examples');
    }
    
    // Add custom tags from the plugin data
    if (pluginData.tags?.length) {
      tags.push(...pluginData.tags);
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Calculate sort order for rule based on type, category, and complexity
   */
  private calculateSortOrder(ruleDoc: RuleDocument): number {
    const pluginData = ruleDoc.pluginData;
    let baseSortOrder = 0;
    
    // Primary sort by rule type (core rules first)
    switch (pluginData.ruleType) {
      case 'core':
        baseSortOrder = 1000;
        break;
      case 'optional':
        baseSortOrder = 2000;
        break;
      case 'variant':
        baseSortOrder = 3000;
        break;
      case 'variant_optional':
        baseSortOrder = 4000;
        break;
      default:
        baseSortOrder = 5000;
        break;
    }
    
    // Secondary sort by category importance
    if (pluginData.category) {
      switch (pluginData.category) {
        case 'definitions':
          baseSortOrder += 100; // Basic definitions first
          break;
        case 'combat':
          baseSortOrder += 200; // Combat rules are commonly used
          break;
        case 'magic':
          baseSortOrder += 300;
          break;
        case 'exploration':
          baseSortOrder += 400;
          break;
        case 'social':
          baseSortOrder += 500;
          break;
        case 'character_creation':
          baseSortOrder += 600;
          break;
        case 'advancement':
          baseSortOrder += 700;
          break;
        case 'equipment':
          baseSortOrder += 800;
          break;
        default:
          baseSortOrder += 900;
          break;
      }
    }
    
    // Tertiary sort by complexity (simpler rules first)
    if (pluginData.mechanics?.complexity) {
      switch (pluginData.mechanics.complexity) {
        case 'simple':
          baseSortOrder += 10;
          break;
        case 'moderate':
          baseSortOrder += 20;
          break;
        case 'complex':
          baseSortOrder += 30;
          break;
      }
    }
    
    // Quaternary sort by basic rule status (basic rules first)
    if (!pluginData.isBasicRule) {
      baseSortOrder += 5; // Non-basic rules go after basic rules
    }
    
    // Final sort by alphabetical order (simplified)
    const nameOffset = Math.min(pluginData.name.charCodeAt(0) - 65, 25); // A=0, B=1, etc., capped at Z
    return baseSortOrder + nameOffset;
  }
}
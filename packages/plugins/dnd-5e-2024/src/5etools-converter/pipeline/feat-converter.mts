/**
 * Type-safe feat converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Fluff data support for enhanced descriptions and images
 * - 2024 feat category classification
 */

import { z } from 'zod';
import { TypedConverter } from './converter.mjs';
import { 
  type FeatDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import type { GeneralFeat, EpicBoonFeat } from '../../types/dnd/feat.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { 
  EtoolsFeat, 
  EtoolsFeatData
} from '../../5etools-types/feats.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndFeatDataSchema, type DndFeatData } from '../../types/dnd/feat.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import type { Ability } from '../../types/dnd/common.mjs';

/**
 * Input schema for 5etools feat data - flexible to handle actual data structures
 */
const etoolsFeatSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  
  // Flexible prerequisite handling - can be array of objects with various formats
  prerequisite: z.array(z.object({
    level: z.number().optional(),
    ability: z.union([
      z.record(z.number()), // Simple format: {"str": 13}
      z.array(z.record(z.number())) // Array format: [{"str": 13}]
    ]).optional(),
    proficiency: z.array(z.string()).optional(),
    spellcasting: z.boolean().optional(),
    other: z.string().optional()
  }).passthrough()).optional(),
  
  // Flexible ability handling - can be simple or complex choose structures
  ability: z.array(z.union([
    z.record(z.number()), // Simple format: {"str": 1}
    z.object({
      choose: z.object({
        from: z.array(z.string()),
        amount: z.number().optional(),
        count: z.number().optional()
      }),
      hidden: z.boolean().optional()
    }).passthrough() // Complex choose format
  ])).optional(),
  
  // Standard fields
  entries: z.array(z.unknown()).optional(), // EtoolsEntry has complex structure
  additionalSpells: z.array(z.unknown()).optional(), // Complex spell reference structure
  skillProficiencies: z.array(z.unknown()).optional(), // Complex proficiency structure
  languageProficiencies: z.array(z.unknown()).optional(), // Complex proficiency structure
  toolProficiencies: z.array(z.unknown()).optional(), // Complex proficiency structure
  
  // 5etools specific fields
  category: z.string().optional(), // "G", "F", "O", "E"
  repeatable: z.boolean().optional(),
  repeatableHidden: z.boolean().optional(),
  srd: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  reprintedAs: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties

/**
 * Feat fluff data interface
 */
interface EtoolsFeatFluff {
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
 * Feat fluff data file structure
 */
interface EtoolsFeatFluffData {
  featFluff?: EtoolsFeatFluff[];
}

/**
 * Typed feat converter using the new pipeline
 */
export class TypedFeatConverter extends TypedConverter<
  typeof etoolsFeatSchema,
  typeof dndFeatDataSchema,
  FeatDocument
> {
  private fluffMap = new Map<string, EtoolsFeatFluff>();

  protected getInputSchema() {
    return etoolsFeatSchema;
  }

  protected getOutputSchema() {
    return dndFeatDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'feat';
  }

  protected extractDescription(input: z.infer<typeof etoolsFeatSchema>): string {
    // Check for fluff description first, then fall back to feat entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    if (input.entries) {
      return processEntries(input.entries as EtoolsEntry[], this.options.textProcessing).text;
    }
    return `Feat: ${input.name}`;
  }

  protected extractAssetPath(input: z.infer<typeof etoolsFeatSchema>): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsFeatSchema>): DndFeatData {
    const description = this.extractDescription(input);
    const category = this.determineFeatCategory(input);
    
    // Create base feat data
    const baseFeat = {
      name: input.name,
      description,
      source: input.source,
      page: input.page
    };

    // Return appropriate feat type based on category
    switch (category) {
      case 'origin':
        return {
          ...baseFeat,
          category: 'origin' as const,
          grantedBy: this.inferGrantingBackground(input.name)
        };
        
      case 'general':
        return {
          ...baseFeat,
          category: 'general' as const,
          prerequisites: this.parseGeneralPrerequisites(input.prerequisite),
          abilityScoreImprovement: this.parseAbilityScoreImprovement(input.ability),
          repeatable: this.isRepeatable(input)
        };
        
      case 'fighting_style':
        return {
          ...baseFeat,
          category: 'fighting_style' as const,
          prerequisites: {
            classFeature: 'Fighting Style' as const
          }
        };
        
      case 'epic_boon':
        return {
          ...baseFeat,
          category: 'epic_boon' as const,
          prerequisites: {
            level: 19 as const
          },
          abilityScoreImprovement: this.parseEpicBoonAbilityImprovement(input.ability)
        };
        
      default:
        // Default to general feat if category can't be determined
        return {
          ...baseFeat,
          category: 'general' as const,
          prerequisites: this.parseGeneralPrerequisites(input.prerequisite),
          abilityScoreImprovement: this.parseAbilityScoreImprovement(input.ability),
          repeatable: false
        };
    }
  }

  /**
   * Load feat fluff data for enhanced descriptions and image assets
   */
  private async loadFluffData(): Promise<void> {
    try {
      const rawFluffData = await this.readEtoolsData('fluff-feats.json');
      const fluffData = safeEtoolsCast<EtoolsFeatFluffData>(rawFluffData, [], 'feat fluff file');
      
      if (fluffData.featFluff) {
        for (const fluff of fluffData.featFluff) {
          this.fluffMap.set(fluff.name, fluff);
        }
        this.log(`Loaded fluff data for ${fluffData.featFluff.length} feats`);
      }
    } catch (error) {
      this.log('Failed to load feat fluff data:', error);
    }
  }

  /**
   * Convert array of feats using the new pipeline
   */
  public async convertFeats(): Promise<{
    success: boolean;
    results: FeatDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed feat conversion...');
      
      // Load fluff data for enhanced descriptions and images
      await this.loadFluffData();
      
      const results: FeatDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read feat data using typed approach
      const rawData = await this.readEtoolsData('feats.json');
      const featData = safeEtoolsCast<EtoolsFeatData>(
        rawData, 
        ['feat'], 
        'feat data file feats.json'
      );

      // Extract and filter feats
      const feats = extractEtoolsArray<EtoolsFeat>(
        featData, 
        'feat', 
        'feat list in feats.json'
      );
      const filteredFeats = this.filterSrdContent(feats);
      
      total = filteredFeats.length;
      this.log(`Processing ${filteredFeats.length} feats`);

      for (const feat of filteredFeats) {
        const result = await this.convertItem(feat);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Feat ${feat.name} converted successfully`);
        } else {
          errors.push(`Failed to convert feat ${feat.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Feat ${feat.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
        }
      }
      
      this.log(`Typed feat conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Feat conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  /**
   * Private helper methods for feat-specific parsing
   */

  private determineFeatCategory(input: z.infer<typeof etoolsFeatSchema>): 'origin' | 'general' | 'fighting_style' | 'epic_boon' {
    // Use 5etools category field if available (most reliable)
    if ('category' in input && typeof input.category === 'string') {
      switch (input.category) {
        case 'G': return 'general';
        case 'F': return 'fighting_style';
        case 'O': return 'origin';
        case 'E': case 'EB': return 'epic_boon';
      }
    }
    
    // Fallback to name-based detection
    const name = input.name.toLowerCase();
    
    // Check for fighting style feats
    if (name.includes('fighting style') || this.isFightingStyleFeat(name)) {
      return 'fighting_style';
    }
    
    // Check for epic boon feats
    if (name.includes('epic boon') || name.includes('boon of')) {
      return 'epic_boon';
    }
    
    // Check for origin feats (typically granted by backgrounds)
    if (this.isOriginFeat(input)) {
      return 'origin';
    }
    
    // Default to general feat
    return 'general';
  }

  private isFightingStyleFeat(name: string): boolean {
    const fightingStyleFeats = [
      'archery', 'defense', 'dueling', 'great weapon fighting', 
      'protection', 'two-weapon fighting', 'blessed warrior', 'druidcraft'
    ];
    return fightingStyleFeats.some(style => name.includes(style));
  }

  private isOriginFeat(input: z.infer<typeof etoolsFeatSchema>): boolean {
    // Origin feats typically have no prerequisites and no ability score improvements
    // or are explicitly mentioned as origin feats in newer sources
    const name = input.name.toLowerCase();
    
    // Check common origin feat patterns
    if (name.includes('origin') || name.includes('background')) {
      return true;
    }
    
    // Origin feats typically have minimal prerequisites
    if (!input.prerequisite || input.prerequisite.length === 0) {
      // And either no ability improvement or specific origin-style improvements
      if (!input.ability || input.ability.length === 0) {
        return true;
      }
    }
    
    return false;
  }

  private inferGrantingBackground(_featName: string): string {
    // Try to infer which background grants this origin feat
    // This would need more sophisticated mapping for a real implementation
    return 'Various Backgrounds';
  }

  private parseGeneralPrerequisites(prerequisite?: z.infer<typeof etoolsFeatSchema>['prerequisite']): GeneralFeat['prerequisites'] {
    if (!prerequisite) {
      return {
        level: 4 // Default minimum level for general feats
      };
    }
    
    const result: GeneralFeat['prerequisites'] = {
      level: prerequisite[0]?.level || 4
    };
    
    // Handle ability prerequisites - can be object or array format
    if (prerequisite[0]?.ability) {
      if (Array.isArray(prerequisite[0].ability)) {
        // Convert array format [{"str": 13}] to object format with expanded names
        const abilityObj: Record<string, number> = {};
        for (const abilityEntry of prerequisite[0].ability) {
          for (const [abbr, value] of Object.entries(abilityEntry)) {
            const fullName = this.expandAbilityAbbreviation(abbr);
            abilityObj[fullName] = value as number;
          }
        }
        result.ability = abilityObj;
      } else {
        // Handle object format and expand abbreviations
        const expandedAbilities: Record<string, number> = {};
        for (const [abbr, value] of Object.entries(prerequisite[0].ability)) {
          const fullName = this.expandAbilityAbbreviation(abbr);
          expandedAbilities[fullName] = value as number;
        }
        result.ability = expandedAbilities;
      }
    }
    
    if (prerequisite[0]?.proficiency) {
      result.proficiency = prerequisite[0].proficiency;
    }
    
    if (prerequisite[0]?.other) {
      result.other = prerequisite[0].other;
    }
    
    return result;
  }

  private parseAbilityScoreImprovement(abilities?: z.infer<typeof etoolsFeatSchema>['ability']): GeneralFeat['abilityScoreImprovement'] {
    if (!abilities || abilities.length === 0) {
      // Default general feat ASI - player can choose any ability
      return {
        choices: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as Ability[],
        value: 1
      };
    }
    
    // Handle different ability formats
    const abilityObj = abilities[0];
    let choices: Ability[] = [];
    
    // Handle complex choose structure
    if ('choose' in abilityObj && abilityObj.choose && typeof abilityObj.choose === 'object' && 'from' in abilityObj.choose) {
      choices = abilityObj.choose.from.map((abbr: string) => this.expandAbilityAbbreviation(abbr));
    } else {
      // Handle simple object format
      choices = Object.keys(abilityObj as Record<string, unknown>).map(abbr => this.expandAbilityAbbreviation(abbr));
    }
    
    return {
      choices,
      value: 1 // General feats always give +1
    };
  }

  private parseEpicBoonAbilityImprovement(abilities?: z.infer<typeof etoolsFeatSchema>['ability']): EpicBoonFeat['abilityScoreImprovement'] {
    if (!abilities || abilities.length === 0) {
      return undefined;
    }
    
    const abilityObj = abilities[0];
    let choices: Ability[] = [];
    let value = 2; // Default for epic boons
    
    // Handle complex choose structure
    if ('choose' in abilityObj && abilityObj.choose && typeof abilityObj.choose === 'object' && 'from' in abilityObj.choose) {
      choices = abilityObj.choose.from.map((abbr: string) => this.expandAbilityAbbreviation(abbr));
      value = ('amount' in abilityObj.choose ? abilityObj.choose.amount : undefined) || 
              ('count' in abilityObj.choose ? abilityObj.choose.count : undefined) || 2;
    } else {
      // Handle simple object format
      choices = Object.keys(abilityObj as Record<string, unknown>).map(abbr => this.expandAbilityAbbreviation(abbr));
      const values = Object.values(abilityObj as Record<string, number>);
      value = Math.max(...values);
    }
    
    return {
      choices,
      value,
      canExceedTwenty: true
    };
  }

  private isRepeatable(input: z.infer<typeof etoolsFeatSchema>): boolean {
    // Check 5etools repeatable field first
    if ('repeatable' in input && typeof input.repeatable === 'boolean') {
      return input.repeatable;
    }
    
    // Fallback to description analysis
    const description = this.extractDescription(input).toLowerCase();
    return description.includes('multiple times') || 
           description.includes('again') ||
           description.includes('additional time');
  }

  /**
   * Helper method to expand ability abbreviations to full names
   */
  private expandAbilityAbbreviation(abbr: string): Ability {
    const abilityMap: Record<string, Ability> = {
      'str': 'strength',
      'dex': 'dexterity', 
      'con': 'constitution',
      'int': 'intelligence',
      'wis': 'wisdom',
      'cha': 'charisma'
    };
    
    return abilityMap[abbr.toLowerCase()] || 'strength';
  }
}
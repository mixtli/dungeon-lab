/**
 * Type-safe background converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Fluff data support for enhanced descriptions
 */

import { z } from 'zod';
import { TypedConverter, type ConversionOptions } from './typed-converter.mjs';
import { 
  backgroundDocumentValidator,
  type BackgroundDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsBackground, EtoolsBackgroundData } from '../../5etools-types/backgrounds.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { dndBackgroundDataSchema, type DndBackgroundData } from '../../types/dnd/background.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import type { Ability } from '../../types/dnd/common.mjs';

/**
 * Input schema for 5etools background data
 */
const etoolsBackgroundSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  skillProficiencies: z.array(z.record(z.boolean())),
  languageProficiencies: z.array(z.any()).optional(),
  toolProficiencies: z.array(z.any()).optional(),
  startingEquipment: z.array(z.any()).optional(),
  entries: z.array(z.any()).optional(),
  feats: z.array(z.any()).optional(),
  abilityScoreImprovement: z.any().optional(),
  srd: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  reprintedAs: z.array(z.string()).optional()
}).passthrough(); // Allow additional properties

/**
 * Background fluff data interface
 */
interface EtoolsBackgroundFluff {
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
 * Background fluff data file structure
 */
interface EtoolsBackgroundFluffData {
  backgroundFluff?: EtoolsBackgroundFluff[];
}

/**
 * Typed background converter using the new pipeline
 */
export class TypedBackgroundConverter extends TypedConverter<
  typeof etoolsBackgroundSchema,
  typeof dndBackgroundDataSchema,
  BackgroundDocument
> {
  private fluffMap = new Map<string, EtoolsBackgroundFluff>();

  protected getInputSchema() {
    return etoolsBackgroundSchema;
  }

  protected getOutputSchema() {
    return dndBackgroundDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'background';
  }

  protected extractDescription(input: EtoolsBackground): string {
    // Check for fluff description first, then fall back to background entries
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.entries) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    if (input.entries) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `Background: ${input.name}`;
  }

  protected extractAssetPath(input: EtoolsBackground): string | undefined {
    if (!this.options.includeAssets) {
      return undefined;
    }
    
    const fluff = this.fluffMap.get(input.name);
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    
    return undefined;
  }

  protected transformData(input: EtoolsBackground): DndBackgroundData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      abilityScores: this.parseAbilityScores(input.abilityScoreImprovement),
      originFeat: this.parseOriginFeat(input.feats),
      skillProficiencies: this.parseSkillProficiencies(input.skillProficiencies),
      toolProficiencies: this.parseToolProficiencies(input.toolProficiencies),
      equipment: this.parseEquipment(input.startingEquipment),
      source: input.source,
      page: input.page
    };
  }

  /**
   * Load background fluff data for enhanced descriptions and image assets
   */
  private async loadFluffData(): Promise<void> {
    try {
      const rawFluffData = await this.readEtoolsData('fluff-backgrounds.json');
      const fluffData = safeEtoolsCast<EtoolsBackgroundFluffData>(rawFluffData, [], 'background fluff file');
      
      if (fluffData.backgroundFluff) {
        for (const fluff of fluffData.backgroundFluff) {
          this.fluffMap.set(fluff.name, fluff);
        }
        this.log(`Loaded fluff data for ${fluffData.backgroundFluff.length} backgrounds`);
      }
    } catch (error) {
      this.log('Failed to load background fluff data:', error);
    }
  }

  /**
   * Convert array of backgrounds using the new pipeline
   */
  public async convertBackgrounds(): Promise<{
    success: boolean;
    results: BackgroundDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed background conversion...');
      
      // Load fluff data for enhanced descriptions and images
      await this.loadFluffData();
      
      const results: BackgroundDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read background data using typed approach
      const rawData = await this.readEtoolsData('backgrounds.json');
      const backgroundData = safeEtoolsCast<EtoolsBackgroundData>(
        rawData, 
        ['background'], 
        'background data file backgrounds.json'
      );

      // Extract and filter backgrounds
      const backgrounds = extractEtoolsArray<EtoolsBackground>(
        backgroundData, 
        'background', 
        'background list in backgrounds.json'
      );
      const filteredBackgrounds = this.filterSrdContent(backgrounds);
      
      total = filteredBackgrounds.length;
      this.log(`Processing ${filteredBackgrounds.length} backgrounds`);

      for (const background of filteredBackgrounds) {
        const result = await this.convertItem(background);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Background ${background.name} converted successfully`);
        } else {
          errors.push(`Failed to convert background ${background.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Background ${background.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
        }
      }
      
      this.log(`Typed background conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Background conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
   * Private helper methods for background-specific parsing
   */

  private parseAbilityScores(abilityScoreImprovement: any): DndBackgroundData['abilityScores'] {
    // For now, provide a default. In 2024, backgrounds should specify the 3 abilities
    // This would need more sophisticated parsing of the actual data structure
    return {
      choices: ['strength', 'dexterity', 'constitution'] as Ability[],
      displayText: 'Choose any three ability scores'
    };
  }

  private parseOriginFeat(feats: any): DndBackgroundData['originFeat'] {
    // For now, provide a default. In 2024, each background grants one origin feat
    // This would need parsing of the actual feat structure
    return {
      name: 'Origin Feat',
      _ref: undefined
    };
  }

  private parseSkillProficiencies(skillProficiencies: any[]): string[] {
    if (!skillProficiencies || skillProficiencies.length === 0) {
      return [];
    }
    
    // Extract skill names from the first proficiency object
    const firstProf = skillProficiencies[0];
    if (typeof firstProf === 'object' && firstProf !== null) {
      return Object.keys(firstProf).filter(skill => firstProf[skill] === true);
    }
    
    return [];
  }

  private parseToolProficiencies(toolProficiencies: any): DndBackgroundData['toolProficiencies'] {
    // For now, return undefined. This would need sophisticated parsing
    // of tool proficiency structures from 5etools
    return undefined;
  }

  private parseEquipment(startingEquipment: any): DndBackgroundData['equipment'] {
    // Provide a default equipment structure for 2024 backgrounds
    // This would need sophisticated parsing of the starting equipment structure
    return {
      equipmentPackage: {
        items: [],
        goldPieces: 0
      },
      goldAlternative: 50,
      currency: 'gp'
    };
  }
}
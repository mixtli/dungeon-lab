/**
 * Type-safe sense converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Comprehensive sense data extraction with mechanics, limitations, and game impact
 */

import { z } from 'zod';
import { TypedConverter } from './typed-converter.mjs';
import { 
  type SenseDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsSenseData } from '../../5etools-types/senses.mjs';
import { etoolsSenseSchema } from '../../5etools-types/senses.mjs';
import { 
  dndSenseDataSchema, 
  type DndSenseData
} from '../../types/dnd/sense.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// SenseDocument type is now imported from the validators file

/**
 * Typed sense converter using the new pipeline
 */
export class TypedSenseConverter extends TypedConverter<
  typeof etoolsSenseSchema,
  typeof dndSenseDataSchema,
  SenseDocument
> {

  protected getInputSchema() {
    return etoolsSenseSchema;
  }

  protected getOutputSchema() {
    return dndSenseDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'sense';
  }

  protected extractDescription(input: z.infer<typeof etoolsSenseSchema>): string {
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    return `${input.name} is a special sense.`;
  }

  protected extractAssetPath(_input: z.infer<typeof etoolsSenseSchema>): string | undefined {
    // Senses typically don't have associated images
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsSenseSchema>): DndSenseData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      source: input.source,
      page: input.page,
      
      // Extract mechanics from description and sense name
      mechanics: this.extractMechanics(input, description),
      
      // Extract limitations
      limitations: this.extractLimitations(input, description),
      
      // Extract typical creatures that have this sense
      typicalCreatures: this.extractTypicalCreatures(input, description),
      
      // Extract acquisition methods
      acquisition: this.extractAcquisition(input, description),
      
      // Extract variants
      variants: this.extractVariants(input, description),
      
      // Extract game impact
      gameImpact: this.extractGameImpact(input, description),
      
      // Extract related senses
      relatedSenses: this.extractRelatedSenses(input, description)
    };
  }

  /**
   * Convert array of senses from the senses.json file
   */
  public async convertSenses(): Promise<{
    success: boolean;
    results: SenseDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed sense conversion...');
      
      const results: SenseDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Process senses.json file
      const filename = 'senses.json';
      
      try {
        const rawData = await this.readEtoolsData(filename);
        const senseData = safeEtoolsCast<EtoolsSenseData>(rawData, ['sense'], `sense data file ${filename}`);
        
        if (!senseData.sense?.length) {
          this.log(`No senses found in ${filename}`);
          return {
            success: true,
            results: [],
            errors: [],
            stats: { total: 0, converted: 0, errors: 0 }
          };
        }

        const filteredSenses = this.filterSrdContent(senseData.sense);
        total += filteredSenses.length;
        
        this.log(`Processing ${filteredSenses.length} senses from ${filename}`);

        for (const sense of filteredSenses) {
          const result = await this.convertItem(sense);
          
          if (result.success && result.document) {
            results.push(result.document);
            converted++;
            this.log(`✅ Sense ${sense.name} converted successfully`);
          } else {
            errors.push(`Failed to convert sense ${sense.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
            this.log(`❌ Sense ${sense.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
          }
        }
      } catch (fileError) {
        const errorMsg = `Failed to process ${filename}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        this.log(errorMsg);
      }
      
      this.log(`Typed sense conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Sense conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  // Helper methods for extracting sense-specific data

  private extractMechanics(input: z.infer<typeof etoolsSenseSchema>, description: string): DndSenseData['mechanics'] {
    const mechanics: DndSenseData['mechanics'] = {};
    const name = input.name.toLowerCase();
    const desc = description.toLowerCase();
    
    // Extract default range
    const rangeMatch = desc.match(/(\d+)\s*(?:feet?|ft\.?)/i);
    if (rangeMatch) {
      mechanics.defaultRange = parseInt(rangeMatch[1]);
    }
    
    // Determine if it works in darkness
    if (name.includes('darkvision') || name.includes('blindsight') || name.includes('truesight')) {
      mechanics.worksInDarkness = true;
    }
    
    // Determine if it detects invisible creatures
    if (name.includes('truesight') || name.includes('blindsight')) {
      mechanics.detectsInvisible = true;
    }
    
    // Determine if it requires line of sight
    if (name.includes('tremorsense') || desc.includes('vibrations')) {
      mechanics.requiresLineOfSight = false;
    } else if (name.includes('darkvision')) {
      mechanics.requiresLineOfSight = true;
    }
    
    // Extract what it detects
    const detects: Array<'creatures' | 'objects' | 'magic' | 'undead' | 'emotions' | 'thoughts' | 'life_force' | 'movement' | 'vibrations' | 'heat' | 'fear'> = [];
    
    if (desc.includes('creature') || desc.includes('living')) detects.push('creatures');
    if (desc.includes('object') || desc.includes('item')) detects.push('objects');
    if (desc.includes('magic') || desc.includes('magical')) detects.push('magic');
    if (desc.includes('undead')) detects.push('undead');
    if (desc.includes('emotion') || desc.includes('mood')) detects.push('emotions');
    if (desc.includes('thought') || desc.includes('mind')) detects.push('thoughts');
    if (desc.includes('life force') || desc.includes('life energy')) detects.push('life_force');
    if (desc.includes('movement') || desc.includes('motion')) detects.push('movement');
    if (desc.includes('vibration') || name.includes('tremorsense')) detects.push('vibrations');
    if (desc.includes('heat') || desc.includes('thermal')) detects.push('heat');
    if (desc.includes('fear') || desc.includes('afraid')) detects.push('fear');
    
    if (detects.length > 0) {
      mechanics.detects = detects;
    }
    
    return Object.keys(mechanics).length > 0 ? mechanics : undefined;
  }

  private extractLimitations(input: z.infer<typeof etoolsSenseSchema>, description: string): DndSenseData['limitations'] {
    const limitations: DndSenseData['limitations'] = {};
    const desc = description.toLowerCase();
    
    // Extract conditions that disable this sense
    const disabledBy: string[] = [];
    if (desc.includes('blinded') || desc.includes('blind')) disabledBy.push('blinded');
    if (desc.includes('deafened') || desc.includes('deaf')) disabledBy.push('deafened');
    if (desc.includes('unconscious')) disabledBy.push('unconscious');
    
    // Extract environmental factors
    const reducedBy: string[] = [];
    if (desc.includes('bright light')) reducedBy.push('bright light');
    if (desc.includes('loud noise')) reducedBy.push('loud noises');
    if (desc.includes('heavy obscurement')) reducedBy.push('heavy obscurement');
    
    // Extract what cannot be detected
    const cannotDetect: string[] = [];
    if (desc.includes('cannot see ethereal')) cannotDetect.push('ethereal creatures');
    if (desc.includes('cannot detect illusions')) cannotDetect.push('illusions');
    
    if (disabledBy.length > 0) limitations.disabledBy = disabledBy;
    if (reducedBy.length > 0) limitations.reducedBy = reducedBy;
    if (cannotDetect.length > 0) limitations.cannotDetect = cannotDetect;
    
    return Object.keys(limitations).length > 0 ? limitations : undefined;
  }

  private extractTypicalCreatures(input: z.infer<typeof etoolsSenseSchema>, _description: string): string[] | undefined {
    const creatures: string[] = [];
    // const _desc = description.toLowerCase(); // Potentially useful for future implementation
    const name = input.name.toLowerCase();
    
    // Common creature associations
    if (name.includes('darkvision')) {
      creatures.push('drow', 'dwarves', 'tieflings', 'most undead', 'many fiends');
    }
    if (name.includes('blindsight')) {
      creatures.push('bats', 'dragons', 'some oozes');
    }
    if (name.includes('truesight')) {
      creatures.push('angels', 'archdevils', 'ancient dragons');
    }
    if (name.includes('tremorsense')) {
      creatures.push('umber hulks', 'purple worms', 'earth elementals');
    }
    
    return creatures.length > 0 ? creatures : undefined;
  }

  private extractAcquisition(input: z.infer<typeof etoolsSenseSchema>, description: string): DndSenseData['acquisition'] {
    const acquisition: DndSenseData['acquisition'] = {};
    const desc = description.toLowerCase();
    
    // Check if can be gained through magic
    if (desc.includes('spell') || desc.includes('magic')) {
      acquisition.magicalMeans = true;
    }
    
    // Check if can be gained through items
    if (desc.includes('magic item') || desc.includes('potion') || desc.includes('ring')) {
      acquisition.magicalItems = true;
    }
    
    // Extract specific spells
    const spells: string[] = [];
    if (desc.includes('darkvision spell')) spells.push('darkvision');
    if (desc.includes('see invisibility')) spells.push('see invisibility');
    if (desc.includes('true seeing')) spells.push('true seeing');
    
    if (spells.length > 0) {
      acquisition.spells = spells;
    }
    
    return Object.keys(acquisition).length > 0 ? acquisition : undefined;
  }

  private extractVariants(_input: z.infer<typeof etoolsSenseSchema>, _description: string): DndSenseData['variants'] | undefined {
    // This would need more sophisticated parsing to extract variants
    // For now, return undefined - variants could be added manually or through fluff data
    return undefined;
  }

  private extractGameImpact(_input: z.infer<typeof etoolsSenseSchema>, _description: string): DndSenseData['gameImpact'] {
    const gameImpact: DndSenseData['gameImpact'] = {};
    // const _desc = description.toLowerCase(); // Potentially useful for future implementation
    const name = _input.name.toLowerCase();
    
    // Stealth interaction
    if (name.includes('blindsight') || name.includes('truesight')) {
      gameImpact.stealthInteraction = 'Cannot be hidden from by invisibility or darkness';
    } else if (name.includes('darkvision')) {
      gameImpact.stealthInteraction = 'Can see in darkness, making stealth harder';
    }
    
    // Combat advantages
    const combatAdvantages: string[] = [];
    if (name.includes('truesight')) {
      combatAdvantages.push('See through illusions', 'Detect shapechangers', 'See invisible creatures');
    }
    if (name.includes('blindsight')) {
      combatAdvantages.push('Fight effectively while blinded', 'Detect invisible creatures');
    }
    
    // Exploration benefits
    const explorationBenefits: string[] = [];
    if (name.includes('darkvision')) {
      explorationBenefits.push('Navigate in darkness without light');
    }
    if (name.includes('tremorsense')) {
      explorationBenefits.push('Detect movement through walls and ground');
    }
    
    if (combatAdvantages.length > 0) gameImpact.combatAdvantages = combatAdvantages;
    if (explorationBenefits.length > 0) gameImpact.explorationBenefits = explorationBenefits;
    
    return Object.keys(gameImpact).length > 0 ? gameImpact : undefined;
  }

  private extractRelatedSenses(input: z.infer<typeof etoolsSenseSchema>, _description: string): string[] | undefined {
    const related: string[] = [];
    const name = input.name.toLowerCase();
    
    // Common relationships
    if (name.includes('darkvision')) {
      related.push('blindsight', 'truesight');
    }
    if (name.includes('blindsight')) {
      related.push('darkvision', 'truesight', 'tremorsense');
    }
    if (name.includes('truesight')) {
      related.push('darkvision', 'blindsight', 'detect magic');
    }
    
    return related.length > 0 ? related : undefined;
  }
}
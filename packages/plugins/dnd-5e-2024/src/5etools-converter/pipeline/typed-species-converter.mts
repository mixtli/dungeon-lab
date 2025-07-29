/**
 * Type-safe species converter
 * 
 * Enhanced pipeline architecture with:
 * - Strict input validation (5etools types)
 * - Type-safe transformation 
 * - Output validation (DnD types)
 * - Proper document structure with discriminators
 * - Comprehensive species data extraction with traits, subraces, and fluff support
 */

import { z } from 'zod';
import { TypedConverter } from './typed-converter.mjs';
import { 
  type SpeciesDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { 
  EtoolsSpeciesData, 
  EtoolsSpeciesFluff, 
  EtoolsSpeciesFluffData
} from '../../5etools-types/species.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { etoolsSpeciesSchema } from '../../5etools-types/species.mjs';
import { 
  dndSpeciesDataSchema, 
  type DndSpeciesData
} from '../../types/dnd/species.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';

// SpeciesDocument type is now imported from the validators file

/**
 * Typed species converter using the new pipeline
 */
export class TypedSpeciesConverter extends TypedConverter<
  typeof etoolsSpeciesSchema,
  typeof dndSpeciesDataSchema,
  SpeciesDocument
> {

  protected getInputSchema() {
    return etoolsSpeciesSchema;
  }

  protected getOutputSchema() {
    return dndSpeciesDataSchema;
  }

  protected getDocumentType(): DocumentType {
    return 'vtt-document';
  }

  protected getPluginDocumentType(): PluginDocumentType {
    return 'species';
  }

  protected extractDescription(input: z.infer<typeof etoolsSpeciesSchema>): string {
    // TODO: Load fluff data for enhanced descriptions
    // Try species entries
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries as EtoolsEntry[], this.options.textProcessing).text;
    }
    
    // Fallback to basic description
    return `${input.name} is a species in D&D 5e.`;
  }

  protected extractAssetPath(_input: z.infer<typeof etoolsSpeciesSchema>): string | undefined {
    // TODO: Load fluff data for image assets
    return undefined;
  }

  protected transformData(input: z.infer<typeof etoolsSpeciesSchema>): DndSpeciesData {
    const description = this.extractDescription(input);
    
    return {
      name: input.name,
      description,
      
      // Extract creature type from new 2024 format or default to Humanoid
      creatureType: input.creatureTypes?.[0] || 'Humanoid',
      
      // Extract size (now as object with category and description) 
      size: this.extractSize(input.size),
      
      // Extract movement (not speed)
      movement: this.extractMovement(input.speed),
      
      // Extract traits (main species abilities)
      traits: this.extractTraits(input),
      
      // Extract ancestry options (for species like Dragonborn)
      ancestryOptions: this.extractAncestryOptions(input),
      
      // Extract lifespan info
      lifespan: this.extractLifespan(input.age),
      
      // Source information
      source: input.source,
      page: input.page
    };
  }

  /**
   * Convert array of species with fluff support
   */
  public async convertSpecies(): Promise<{
    success: boolean;
    results: SpeciesDocument[];
    errors: string[];
    stats: { total: number; converted: number; errors: number };
  }> {
    try {
      this.log('Starting typed species conversion...');
      
      const results: SpeciesDocument[] = [];
      const errors: string[] = [];
      let total = 0;
      let converted = 0;

      // Read species data
      const rawSpeciesData = await this.readEtoolsData('races.json');
      const speciesData = safeEtoolsCast<EtoolsSpeciesData>(rawSpeciesData, ['race'], 'races.json');
      
      if (!speciesData.race?.length) {
        this.log('No species found in races.json');
        return {
          success: true,
          results: [],
          errors: [],
          stats: { total: 0, converted: 0, errors: 0 }
        };
      }

      const filteredSpecies = this.filterSrdContent(speciesData.race);
      total += filteredSpecies.length;
      
      // Read fluff data
      let fluffData: EtoolsSpeciesFluffData | null = null;
      try {
        const rawFluffData = await this.readEtoolsData('fluff-races.json');
        fluffData = safeEtoolsCast<EtoolsSpeciesFluffData>(rawFluffData, ['raceFluff'], 'fluff-races.json');
      } catch {
        this.log('No fluff data found for species');
      }

      // Create fluff lookup map
      const fluffMap = new Map<string, EtoolsSpeciesFluff>();
      if (fluffData?.raceFluff) {
        for (const fluff of fluffData.raceFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }
      
      this.log(`Processing ${filteredSpecies.length} species`);

      for (const speciesItem of filteredSpecies) {
        // const _fluff = fluffMap.get(speciesItem.name); // TODO: Use fluff data for enhanced descriptions
        const result = await this.convertItem(speciesItem);
        
        if (result.success && result.document) {
          results.push(result.document);
          converted++;
          this.log(`✅ Species ${speciesItem.name} converted successfully`);
        } else {
          errors.push(`Failed to convert species ${speciesItem.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
          this.log(`❌ Species ${speciesItem.name}: ${result.errors?.join(', ') || 'Conversion failed'}`);
        }
      }
      
      this.log(`Typed species conversion complete. Stats: ${converted}/${total} converted, ${errors.length} errors`);
      
      return {
        success: true,
        results,
        errors,
        stats: { total, converted, errors: errors.length }
      };
    } catch (error) {
      const errorMessage = `Species conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.log(errorMessage);
      
      return {
        success: false,
        results: [],
        errors: [errorMessage],
        stats: { total: 0, converted: 0, errors: 1 }
      };
    }
  }

  // Helper methods for extracting species-specific data

  private extractSize(size?: string[]): DndSpeciesData['size'] {
    if (!size?.length) {
      return { category: 'medium', description: 'about 5-6 feet tall' };
    }
    
    const sizeMap: Record<string, { category: DndSpeciesData['size']['category'], description: string }> = {
      'T': { category: 'tiny', description: 'about 2-4 feet tall' },
      'S': { category: 'small', description: 'about 3-4 feet tall' }, 
      'M': { category: 'medium', description: 'about 5-6 feet tall' },
      'L': { category: 'large', description: 'about 7-8 feet tall' },
      'H': { category: 'huge', description: 'about 12+ feet tall' },
      'G': { category: 'huge', description: 'about 20+ feet tall' } // Gargantuan maps to huge
    };
    
    return sizeMap[size[0]] || { category: 'medium', description: 'about 5-6 feet tall' };
  }

  private extractMovement(speed?: unknown): DndSpeciesData['movement'] {
    if (!speed) {
      return { walk: 30 }; // Default speed
    }
    
    const movement: DndSpeciesData['movement'] = { walk: 30 };
    
    const speedData = speed as Record<string, number | boolean>;
    if (typeof speedData === 'object' && speedData) {
      if (typeof speedData.walk === 'number') movement.walk = speedData.walk;
      if (speedData.fly) {
        // Handle boolean fly speed (means equal to walk speed)
        movement.fly = typeof speedData.fly === 'boolean' ? movement.walk : speedData.fly as number;
        if (speedData.hover || speedData.canHover) {
          movement.hover = true;
        }
      }
      if (speedData.swim) {
        // Handle boolean swim speed (means equal to walk speed)
        movement.swim = typeof speedData.swim === 'boolean' ? movement.walk : speedData.swim as number;
      }
      if (speedData.climb) {
        // Handle boolean climb speed (means equal to walk speed)
        movement.climb = typeof speedData.climb === 'boolean' ? movement.walk : speedData.climb as number;
      }
      if (typeof speedData.burrow === 'number') movement.burrow = speedData.burrow;
    } else if (typeof speedData === 'number') {
      movement.walk = speedData;
    }
    
    return movement;
  }


  private extractTraits(input: z.infer<typeof etoolsSpeciesSchema>): DndSpeciesData['traits'] {
    const traits: DndSpeciesData['traits'] = [];
    
    // Extract ability score improvements as traits
    if (input.ability?.length) {
      for (const ability of input.ability) {
        traits.push({
          name: 'Ability Score Increase',
          description: this.formatAbilityScoreIncrease(ability)
        });
      }
    }
    
    // Extract proficiencies as traits
    const proficiencyTraits = this.extractProficiencyTraits(input);
    traits.push(...proficiencyTraits);
    
    // Extract resistances/immunities as traits
    const resistanceTraits = this.extractResistanceTraits(input);
    traits.push(...resistanceTraits);
    
    // Extract additional spells as traits
    if (input.additionalSpells?.length) {
      traits.push({
        name: 'Spellcasting',
        description: 'You know certain spells as part of your racial heritage.'
      });
    }
    
    return traits;
  }


  private extractAncestryOptions(input: z.infer<typeof etoolsSpeciesSchema>): DndSpeciesData['ancestryOptions'] {
    // For species like Dragonborn that have ancestry variations
    if (input.name.toLowerCase().includes('dragonborn') && input.traitTags?.includes('Breath Weapon')) {
      return [{
        name: 'Draconic Ancestry',
        description: 'You have draconic ancestry that determines your breath weapon and damage resistance.',
        affectedTraits: ['Breath Weapon', 'Damage Resistance']
      }];
    }
    
    return undefined;
  }

  private extractLifespan(age?: unknown): DndSpeciesData['lifespan'] {
    if (!age) {
      return { maturity: 18, average: 80, maximum: 120 }; // Default human-like lifespan
    }
    
    const ageData = age as { mature?: number; max?: number; [key: string]: unknown };
    return {
      maturity: ageData.mature || 18,
      average: ageData.max ? Math.floor(ageData.max * 0.75) : 80, // Estimate average as 75% of max
      maximum: ageData.max || 120
    };
  }

  private formatAbilityScoreIncrease(ability: unknown): string {
    const abilityData = ability as { [key: string]: number } | { choose: { from: string[]; count: number; amount?: number } };
    const increases: string[] = [];
    
    if (!abilityData || typeof abilityData !== 'object') {
      return 'Your ability scores increase.';
    }
    
    // Handle choose format
    if ('choose' in abilityData && abilityData.choose && typeof abilityData.choose === 'object') {
      const chooseData = abilityData.choose as { count: number; amount?: number };
      const count = chooseData.count || 1;
      const amount = chooseData.amount || 1;
      increases.push(`Choose ${count} different abilities to increase by ${amount}`);
    } else {
      // Handle direct ability increases
      const directAbilities = abilityData as { [key: string]: number };
      if (directAbilities.str) increases.push(`Strength +${directAbilities.str}`);
      if (directAbilities.dex) increases.push(`Dexterity +${directAbilities.dex}`);
      if (directAbilities.con) increases.push(`Constitution +${directAbilities.con}`);
      if (directAbilities.int) increases.push(`Intelligence +${directAbilities.int}`);
      if (directAbilities.wis) increases.push(`Wisdom +${directAbilities.wis}`);
      if (directAbilities.cha) increases.push(`Charisma +${directAbilities.cha}`);
    }
    
    return increases.length > 0 ? increases.join(', ') + '.' : 'Your ability scores increase.';
  }

  private extractProficiencyTraits(input: z.infer<typeof etoolsSpeciesSchema>): DndSpeciesData['traits'] {
    const traits: DndSpeciesData['traits'] = [];
    
    if (input.skillProficiencies?.length) {
      traits.push({
        name: 'Skill Proficiency',
        description: 'You have proficiency with certain skills.'
      });
    }
    
    if (input.languageProficiencies?.length) {
      traits.push({
        name: 'Languages',
        description: 'You know certain languages.'
      });
    }
    
    if (input.toolProficiencies?.length) {
      traits.push({
        name: 'Tool Proficiency', 
        description: 'You have proficiency with certain tools.'
      });
    }
    
    if (input.weaponProficiencies?.length) {
      traits.push({
        name: 'Weapon Proficiency',
        description: `You have proficiency with ${input.weaponProficiencies.join(', ')}.`
      });
    }
    
    if (input.armorProficiencies?.length) {
      traits.push({
        name: 'Armor Proficiency',
        description: `You have proficiency with ${input.armorProficiencies.join(', ')}.`
      });
    }
    
    return traits;
  }

  private extractResistanceTraits(input: z.infer<typeof etoolsSpeciesSchema>): DndSpeciesData['traits'] {
    const traits: DndSpeciesData['traits'] = [];
    
    if (input.resist?.length) {
      traits.push({
        name: 'Damage Resistance',
        description: `You have resistance to ${input.resist.join(', ')} damage.`
      });
    }
    
    if (input.immune?.length) {
      traits.push({
        name: 'Damage Immunity',
        description: `You have immunity to ${input.immune.join(', ')} damage.`
      });
    }
    
    if (input.conditionImmune?.length) {
      traits.push({
        name: 'Condition Immunity',
        description: `You are immune to the ${input.conditionImmune.join(', ')} condition(s).`
      });
    }
    
    return traits;
  }
}
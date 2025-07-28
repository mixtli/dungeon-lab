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

import { TypedConverter } from './typed-converter.mjs';
import { 
  type SpeciesDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/typed-document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { EtoolsSpecies, EtoolsSpeciesData, EtoolsSpeciesFluff, EtoolsSpeciesFluffData } from '../../5etools-types/species.mjs';
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

  protected extractDescription(input: EtoolsSpecies, fluff?: EtoolsSpeciesFluff): string {
    // Try fluff data first
    if (fluff?.entries && fluff.entries.length > 0) {
      return processEntries(fluff.entries, this.options.textProcessing).text;
    }
    
    // Try species entries
    if (input.entries && input.entries.length > 0) {
      return processEntries(input.entries, this.options.textProcessing).text;
    }
    
    // Fallback to basic description
    return `${input.name} is a species in D&D 5e.`;
  }

  protected extractAssetPath(input: EtoolsSpecies, fluff?: EtoolsSpeciesFluff): string | undefined {
    if (fluff?.images?.[0]?.href?.path) {
      return fluff.images[0].href.path;
    }
    return undefined;
  }

  protected transformData(input: EtoolsSpecies, fluff?: EtoolsSpeciesFluff): DndSpeciesData {
    const description = this.extractDescription(input, fluff);
    
    return {
      name: input.name,
      description,
      
      // Extract creature type from new 2024 format or default to Humanoid
      creatureType: input.creatureTypes?.[0] || 'Humanoid',
      
      // Extract size (now as object with category and description) 
      size: this.extractSize(input.size),
      
      // Extract movement (not speed)
      movement: this.extractMovement(input.speed),
      
      // Extract senses
      senses: this.extractSenses(input),
      
      // Extract traits (main species abilities)
      traits: this.extractTraits(input),
      
      // Extract subraces if available  
      subraces: this.extractSubraces(input.subraces),
      
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
        const fluff = fluffMap.get(speciesItem.name);
        const result = await this.convertItem(speciesItem, fluff);
        
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

  private extractMovement(speed?: any): DndSpeciesData['movement'] {
    if (!speed) {
      return { walk: 30 }; // Default speed
    }
    
    const movement: DndSpeciesData['movement'] = { walk: 30 };
    
    if (typeof speed === 'object') {
      if (speed.walk) movement.walk = speed.walk;
      if (speed.fly) {
        // Handle boolean fly speed (means equal to walk speed)
        movement.fly = typeof speed.fly === 'boolean' ? movement.walk : speed.fly;
        if (speed.hover || speed.canHover) {
          movement.hover = true;
        }
      }
      if (speed.swim) {
        // Handle boolean swim speed (means equal to walk speed)
        movement.swim = typeof speed.swim === 'boolean' ? movement.walk : speed.swim;
      }
      if (speed.climb) {
        // Handle boolean climb speed (means equal to walk speed)
        movement.climb = typeof speed.climb === 'boolean' ? movement.walk : speed.climb;
      }
      if (speed.burrow) movement.burrow = speed.burrow;
    } else if (typeof speed === 'number') {
      movement.walk = speed;
    }
    
    return movement;
  }

  private extractSenses(input: EtoolsSpecies): DndSpeciesData['senses'] {
    const senses: DndSpeciesData['senses'] = {};
    
    if (input.darkvision) {
      senses.darkvision = input.darkvision;
    }
    
    if (input.blindsight) {
      senses.blindsight = input.blindsight;
    }
    
    if (input.truesight) {
      senses.truesight = input.truesight;
    }
    
    return Object.keys(senses).length > 0 ? senses : undefined;
  }

  private extractTraits(input: EtoolsSpecies): DndSpeciesData['traits'] {
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

  private extractSubraces(subraces?: any[]): DndSpeciesData['subraces'] {
    if (!subraces?.length) return undefined;
    
    return subraces.map(subrace => ({
      name: subrace.name || 'Unknown Subrace',
      description: subrace.entries ? processEntries(subrace.entries, this.options.textProcessing).text : `${subrace.name} subrace.`,
      traits: [] // Could be enhanced to extract subrace-specific traits
    }));
  }

  private extractAncestryOptions(input: EtoolsSpecies): DndSpeciesData['ancestryOptions'] {
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

  private extractLifespan(age?: any): DndSpeciesData['lifespan'] {
    if (!age) {
      return { maturity: 18, average: 80, maximum: 120 }; // Default human-like lifespan
    }
    
    return {
      maturity: age.mature || 18,
      average: age.max ? Math.floor(age.max * 0.75) : 80, // Estimate average as 75% of max
      maximum: age.max || 120
    };
  }

  private formatAbilityScoreIncrease(ability: any): string {
    const increases: string[] = [];
    
    if (ability.str) increases.push(`Strength +${ability.str}`);
    if (ability.dex) increases.push(`Dexterity +${ability.dex}`);
    if (ability.con) increases.push(`Constitution +${ability.con}`);
    if (ability.int) increases.push(`Intelligence +${ability.int}`);
    if (ability.wis) increases.push(`Wisdom +${ability.wis}`);
    if (ability.cha) increases.push(`Charisma +${ability.cha}`);
    
    if (ability.choose) {
      const count = ability.choose.count || 1;
      const amount = ability.choose.amount || 1;
      increases.push(`Choose ${count} different abilities to increase by ${amount}`);
    }
    
    return increases.length > 0 ? increases.join(', ') + '.' : 'Your ability scores increase.';
  }

  private extractProficiencyTraits(input: EtoolsSpecies): DndSpeciesData['traits'] {
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

  private extractResistanceTraits(input: EtoolsSpecies): DndSpeciesData['traits'] {
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
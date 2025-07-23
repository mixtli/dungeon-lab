/**
 * Species converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import { speciesDocumentSchema } from '../../types/vttdocument.mjs';
import { z } from 'zod';

type ISpeciesDocument = z.infer<typeof speciesDocumentSchema>;

// Size mapping from 5etools to our schema
const SIZE_MAP: Record<string, 'tiny' | 'small' | 'medium' | 'large' | 'huge'> = {
  T: 'tiny',
  S: 'small',
  M: 'medium',
  L: 'large',
  H: 'huge',
  G: 'huge' // Gargantuan maps to huge as it's not in our schema
};

export class SpeciesWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting species wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read race data (5etools calls them races, we call them species)
      const raceData = await readEtoolsData('races.json');
      const fluffData = await readEtoolsData('fluff-races.json');
      
      // Create fluff lookup map
      const fluffMap = new Map();
      if (fluffData.raceFluff) {
        for (const fluff of fluffData.raceFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }
      
      const races = raceData.race || [];
      const filteredRaces = this.options.srdOnly ? filterSrdContent(races) : races;
      
      stats.total = filteredRaces.length;
      this.log(`Processing ${filteredRaces.length} species`);

      for (let i = 0; i < filteredRaces.length; i++) {
        const raceRaw = filteredRaces[i];
        try {
          const fluff = fluffMap.get(raceRaw.name);
          const { species, assetPath } = this.convertSpecies(raceRaw, fluff);

          // Create wrapper format
          const wrapper = this.createWrapper(
            species.name,
            species,
            'vttdocument',
            {
              imageId: assetPath,
              category: this.determineCategory(raceRaw, 'vttdocument'),
              tags: this.extractTags(raceRaw, 'vttdocument'),
              sortOrder: this.calculateSortOrder(raceRaw, 'vttdocument') + i
            }
          );
          
          content.push({
            type: 'vttdocument',
            wrapper,
            originalPath: 'races.json'
          });
          
          stats.converted++;
        } catch (error) {
          this.log(`Error converting species ${raceRaw.name}:`, error);
          stats.errors++;
        }
      }

      this.log(`Species wrapper conversion complete. Stats:`, stats);
      
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

  private convertSpecies(raceData: any, fluffData?: any): { species: ISpeciesDocument; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    const species: ISpeciesDocument = {
      id: `species-${this.generateSlug(raceData.name)}`, // Temporary ID for wrapper format
      name: raceData.name,
      slug: this.generateSlug(raceData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'species',
      description: this.buildDescription(raceData, fluffData),
      
      // Species-specific data
      data: {
        name: raceData.name,
        description: this.buildDescription(raceData, fluffData),
        size: this.extractSize(raceData.size),
        speed: this.extractSpeed(raceData.speed),
        traits: this.extractTraits(raceData.entries || []),
        subspecies: this.extractSubspecies(raceData.subraces || [])
      }
    };

    return { species, assetPath };
  }

  private buildDescription(raceData: any, fluffData?: any): string {
    let description = '';
    
    // Use fluff description if available
    if (fluffData?.entries) {
      description = formatEntries(fluffData.entries);
    } else if (raceData.entries) {
      description = formatEntries(raceData.entries);
    }
    
    // Fallback description
    if (!description) {
      description = `The ${raceData.name} species provides unique traits and characteristics for character creation.`;
    }
    
    return description.trim();
  }

  private extractSize(sizeData: any): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
    if (!sizeData) return 'medium';
    
    // Handle array format
    if (Array.isArray(sizeData)) {
      const firstSize = sizeData[0];
      return SIZE_MAP[firstSize] || 'medium';
    }
    
    // Handle string format
    if (typeof sizeData === 'string') {
      return SIZE_MAP[sizeData] || 'medium';
    }
    
    return 'medium';
  }

  private extractSpeed(speedData: any): number {
    if (!speedData) return 30;
    
    // Handle simple number format
    if (typeof speedData === 'number') {
      return speedData;
    }
    
    // Handle object format with walk speed
    if (typeof speedData === 'object' && speedData.walk) {
      return speedData.walk;
    }
    
    return 30;
  }

  private extractTraits(entries: any[]): Array<{ name: string; description: string }> {
    const traits: Array<{ name: string; description: string }> = [];
    
    if (!Array.isArray(entries)) return traits;
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry.name && entry.entries) {
        traits.push({
          name: entry.name,
          description: formatEntries(entry.entries)
        });
      }
    }
    
    return traits;
  }

  private extractSubspecies(subraces: any[]): Array<{
    name: string;
    description: string;
    speed?: number;
    abilityScoreIncrease?: Record<string, number>;
    traits?: Array<{ name: string; description: string }>;
    spells?: Array<{
      name?: string;
      cantrips: string[];
      spells: Array<{ level: number; spells: string[] }>;
    }>;
  }> | undefined {
    if (!Array.isArray(subraces) || subraces.length === 0) return undefined;
    
    return subraces.map(subrace => ({
      name: subrace.name || 'Unknown Subrace',
      description: formatEntries(subrace.entries || []),
      speed: this.extractSpeed(subrace.speed),
      abilityScoreIncrease: this.extractAbilityScoreIncrease(subrace.ability),
      traits: this.extractTraits(subrace.entries || []),
      spells: this.extractSpells(subrace.additionalSpells)
    }));
  }

  private extractAbilityScoreIncrease(abilityData: any): Record<string, number> | undefined {
    if (!abilityData) return undefined;
    
    const abilities: Record<string, number> = {};
    
    // Handle different ability score formats
    if (Array.isArray(abilityData)) {
      for (const ability of abilityData) {
        if (typeof ability === 'object') {
          for (const [key, value] of Object.entries(ability)) {
            if (typeof value === 'number') {
              abilities[this.normalizeAbility(key)] = value;
            }
          }
        }
      }
    } else if (typeof abilityData === 'object') {
      for (const [key, value] of Object.entries(abilityData)) {
        if (typeof value === 'number') {
          abilities[this.normalizeAbility(key)] = value;
        }
      }
    }
    
    return Object.keys(abilities).length > 0 ? abilities : undefined;
  }

  private extractSpells(spellData: any[]): Array<{
    name?: string;
    cantrips: string[];
    spells: Array<{ level: number; spells: string[] }>;
  }> | undefined {
    if (!Array.isArray(spellData) || spellData.length === 0) return undefined;
    
    // Simplified spell extraction - would need more complex logic for full implementation
    return spellData.map(spell => ({
      name: spell.name,
      cantrips: spell.cantrips || [],
      spells: spell.spells || []
    }));
  }

  private normalizeAbility(ability: string): string {
    const abilityMap: Record<string, string> = {
      str: 'strength',
      dex: 'dexterity', 
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    
    return abilityMap[ability.toLowerCase()] || ability.toLowerCase();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Override category determination for species
   */
  protected determineCategory(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'vttdocument') {
      return 'Species';
    }
    return super.determineCategory(sourceData, contentType);
  }
}
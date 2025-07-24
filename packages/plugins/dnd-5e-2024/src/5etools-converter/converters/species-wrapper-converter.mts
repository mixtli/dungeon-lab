/**
 * Species converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import { speciesDocumentSchema } from '../../types/vttdocument.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
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
      const raceData = await readEtoolsData<{ race?: Array<Record<string, unknown>> }>('races.json');
      const fluffData = await readEtoolsData<{ raceFluff?: Array<Record<string, unknown>> }>('fluff-races.json');
      
      // Create fluff lookup map
      const fluffMap = new Map<string, Record<string, unknown>>();
      if (fluffData.raceFluff) {
        for (const fluff of fluffData.raceFluff) {
          if (fluff && typeof fluff === 'object' && 'name' in fluff && typeof fluff.name === 'string') {
            fluffMap.set(fluff.name, fluff);
          }
        }
      }
      
      const races = raceData.race || [];
      const filteredRaces = this.options.srdOnly ? filterSrdContent(races) : races;
      
      stats.total = filteredRaces.length;
      this.log(`Processing ${filteredRaces.length} species`);

      for (let i = 0; i < filteredRaces.length; i++) {
        const raceRaw = filteredRaces[i];
        try {
          const fluff = fluffMap.get(String(raceRaw && typeof raceRaw === 'object' && 'name' in raceRaw ? raceRaw.name : 'unknown'));
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

  private convertSpecies(raceData: Record<string, unknown>, fluffData?: Record<string, unknown>): { species: ISpeciesDocument; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets && 'images' in fluffData && 
        Array.isArray(fluffData.images) && fluffData.images.length > 0) {
      const firstImage = fluffData.images[0];
      if (firstImage && typeof firstImage === 'object' && 'href' in firstImage && 
          firstImage.href && typeof firstImage.href === 'object' && 'path' in firstImage.href && 
          typeof firstImage.href.path === 'string') {
        assetPath = firstImage.href.path;
      }
    }

    const species: ISpeciesDocument = {
      id: `species-${this.generateSlug(String(raceData.name || 'unknown'))}`, // Temporary ID for wrapper format
      name: String(raceData.name || 'Unknown Species'),
      slug: this.generateSlug(String(raceData.name || 'unknown')),
      pluginId: 'dnd-5e-2024',
      documentType: 'species',
      description: this.buildDescription(raceData, fluffData),
      
      // Species-specific data
      data: {
        name: String(raceData.name || 'Unknown Species'),
        description: this.buildDescription(raceData, fluffData),
        size: this.extractSize(raceData.size),
        speed: this.extractSpeed(raceData.speed),
        traits: this.extractTraits(Array.isArray(raceData.entries) ? raceData.entries as EtoolsEntry[] : []),
        subspecies: this.extractSubspecies(Array.isArray(raceData.subraces) ? raceData.subraces : [])
      }
    };

    return { species, assetPath };
  }

  private buildDescription(raceData: Record<string, unknown>, fluffData?: Record<string, unknown>): string {
    let description = '';
    
    // Use fluff description if available
    if (fluffData && 'entries' in fluffData && Array.isArray(fluffData.entries)) {
      description = formatEntries(fluffData.entries as EtoolsEntry[]);
    } else if (raceData && 'entries' in raceData && Array.isArray(raceData.entries)) {
      description = formatEntries(raceData.entries as EtoolsEntry[]);
    }
    
    // Fallback description
    if (!description) {
      description = `The ${raceData.name} species provides unique traits and characteristics for character creation.`;
    }
    
    return description.trim();
  }

  private extractSize(sizeData: unknown): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
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

  private extractSpeed(speedData: unknown): number {
    if (!speedData) return 30;
    
    // Handle simple number format
    if (typeof speedData === 'number') {
      return speedData;
    }
    
    // Handle object format with walk speed
    if (typeof speedData === 'object' && speedData && 'walk' in speedData && typeof speedData.walk === 'number') {
      return speedData.walk;
    }
    
    return 30;
  }

  private extractTraits(entries: EtoolsEntry[]): Array<{ name: string; description: string }> {
    const traits: Array<{ name: string; description: string }> = [];
    
    if (!Array.isArray(entries)) return traits;
    
    for (const entry of entries) {
      if (typeof entry === 'object' && entry && 'name' in entry && 'entries' in entry && 
          typeof entry.name === 'string' && Array.isArray(entry.entries)) {
        traits.push({
          name: entry.name,
          description: formatEntries(entry.entries as EtoolsEntry[])
        });
      }
    }
    
    return traits;
  }

  private extractSubspecies(subraces: Record<string, unknown>[]): Array<{
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
      name: (subrace && typeof subrace === 'object' && 'name' in subrace ? String(subrace.name) : 'Unknown Subrace'),
      description: formatEntries((subrace && typeof subrace === 'object' && 'entries' in subrace && Array.isArray(subrace.entries)) ? subrace.entries as EtoolsEntry[] : []),
      speed: this.extractSpeed(subrace && typeof subrace === 'object' && 'speed' in subrace ? subrace.speed : undefined),
      abilityScoreIncrease: this.extractAbilityScoreIncrease(subrace && typeof subrace === 'object' && 'ability' in subrace ? subrace.ability : undefined),
      traits: this.extractTraits((subrace && typeof subrace === 'object' && 'entries' in subrace && Array.isArray(subrace.entries)) ? subrace.entries as EtoolsEntry[] : []),
      spells: this.extractSpells((subrace && typeof subrace === 'object' && 'additionalSpells' in subrace && Array.isArray(subrace.additionalSpells)) ? subrace.additionalSpells : [])
    }));
  }

  private extractAbilityScoreIncrease(abilityData: unknown): Record<string, number> | undefined {
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

  private extractSpells(spellData: Record<string, unknown>[]): Array<{
    name?: string;
    cantrips: string[];
    spells: Array<{ level: number; spells: string[] }>;
  }> | undefined {
    if (!Array.isArray(spellData) || spellData.length === 0) return undefined;
    
    // Simplified spell extraction - would need more complex logic for full implementation
    return spellData.map(spell => ({
      name: (spell && typeof spell === 'object' && 'name' in spell ? String(spell.name) : undefined),
      cantrips: (spell && typeof spell === 'object' && 'cantrips' in spell && Array.isArray(spell.cantrips)) ? spell.cantrips as string[] : [],
      spells: (spell && typeof spell === 'object' && 'spells' in spell && Array.isArray(spell.spells)) ? spell.spells as Array<{ level: number; spells: string[] }> : []
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
  protected determineCategory<T = Record<string, unknown>>(sourceData: T, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    if (contentType === 'vttdocument') {
      return 'Species';
    }
    return super.determineCategory(sourceData, contentType);
  }
}
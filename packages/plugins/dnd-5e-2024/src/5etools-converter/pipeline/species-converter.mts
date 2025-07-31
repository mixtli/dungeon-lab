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
import { TypedConverter } from './converter.mjs';
import { 
  type SpeciesDocument,
  type DocumentType,
  type PluginDocumentType
} from '../validation/document-validators.mjs';
import { processEntries } from '../text/markup-processor.mjs';
import type { 
  EtoolsSpeciesData, 
  EtoolsSpeciesFluff, 
  EtoolsSpeciesFluffData
} from '../../5etools-types/species.mjs';
import type { EtoolsEntry, EtoolsChoice } from '../../5etools-types/base.mjs';
import { etoolsSpeciesSchema } from '../../5etools-types/species.mjs';
import { 
  dndSpeciesDataSchema, 
  type DndSpeciesData,
  type DndSpecialSenses,
  type DndSkillProficiency,
  type DndSpeciesLineage,
  type DndSpellProgression
} from '../../types/dnd/species.mjs';
import { safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
import { expandSpellcastingAbility, type SpellReferenceObject, SKILLS_2024, type Skill } from '../../types/dnd/common.mjs';

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
      size: this.extractSize(input.size, input.sizeEntry),
      
      // Extract movement (not speed)
      movement: this.extractMovement(input.speed),
      
      // Extract special senses like darkvision
      specialSenses: this.extractSpecialSenses(input.darkvision as number | undefined, input.blindsight as number | undefined, input.tremorsense as number | undefined, input.truesight as number | undefined),
      
      // Extract skill proficiencies with choices
      skillProficiencies: this.extractSkillProficiencies(input.skillProficiencies),
      
      // Extract traits (main species abilities)
      traits: this.extractTraits(input),
      
      // Extract lineage options with spell progressions (replaces ancestryOptions)
      lineages: this.extractLineages(input.additionalSpells),
      
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

  private extractSize(size?: string[], sizeEntry?: unknown): DndSpeciesData['size'] {
    let description = 'about 5-6 feet tall';
    
    // Extract description from sizeEntry if available (XPHB format)
    if (sizeEntry && typeof sizeEntry === 'object' && 'entries' in sizeEntry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries = (sizeEntry as any).entries;
      if (Array.isArray(entries) && entries[0]) {
        description = entries[0];
      }
    }
    
    if (!size?.length) {
      return { category: 'medium', description };
    }
    
    const sizeMap: Record<string, DndSpeciesData['size']['category']> = {
      'T': 'tiny',
      'S': 'small', 
      'M': 'medium',
      'L': 'large',
      'H': 'huge',
      'G': 'gargantuan'
    };
    
    return { 
      category: sizeMap[size[0]] || 'medium',
      description
    };
  }

  private extractSpecialSenses(darkvision?: number, blindsight?: number, tremorsense?: number, truesight?: number): DndSpecialSenses | undefined {
    const senses: DndSpecialSenses = {};

    if (darkvision) senses.darkvision = darkvision;
    if (blindsight) senses.blindsight = blindsight;
    if (tremorsense) senses.tremorsense = tremorsense;
    if (truesight) senses.truesight = truesight;

    return Object.keys(senses).length > 0 ? senses : undefined;
  }

  private extractSkillProficiencies(skillProficiencies?: Array<{
    choose?: EtoolsChoice<string>;
    [skill: string]: boolean | EtoolsChoice<string> | undefined;
  }>): DndSkillProficiency | undefined {
    if (!skillProficiencies?.length) return undefined;

    const result: DndSkillProficiency = {};
    const fixed: Skill[] = [];
    const choices: Array<{ count: number; from: Skill[]; description?: string }> = [];

    for (const prof of skillProficiencies) {
      if (typeof prof === 'object' && prof) {
        const profObj = prof;
        
        // Handle choice objects like {"choose": {"from": ["insight", "perception", "survival"]}}
        if (profObj.choose && typeof profObj.choose === 'object' && 'from' in profObj.choose) {
          const choiceData = profObj.choose as { from: string[]; count?: number };
          // Filter to only valid skill names
          const validSkills = choiceData.from.filter(skill => 
            SKILLS_2024.includes(skill as Skill)
          ) as Skill[];
          
          if (validSkills.length > 0) {
            choices.push({
              count: choiceData.count || 1,
              from: validSkills,
              description: `Choose ${choiceData.count || 1} from ${validSkills.join(', ')}`
            });
          }
        }
        
        // Handle fixed proficiencies (less common for species)
        for (const [skill, value] of Object.entries(profObj)) {
          if (value === true && skill !== 'choose' && SKILLS_2024.includes(skill as Skill)) {
            fixed.push(skill as Skill);
          }
        }
      }
    }

    if (fixed.length > 0) result.fixed = fixed;
    if (choices.length > 0) result.choices = choices;

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private extractLineages(additionalSpells?: unknown[]): DndSpeciesLineage[] | undefined {
    if (!additionalSpells?.length) return undefined;

    const lineages: DndSpeciesLineage[] = [];

    for (const spellData of additionalSpells) {
      if (typeof spellData === 'object' && spellData && 'name' in spellData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spellObj = spellData as any;
        
        const lineage: DndSpeciesLineage = {
          name: spellObj.name,
          description: `${spellObj.name} lineage with unique spell progression`,
          level1Benefits: this.extractLevel1Benefits(spellObj),
          spellProgression: this.extractSpellProgression(spellObj)
        };

        lineages.push(lineage);
      }
    }

    return lineages.length > 0 ? lineages : undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractLevel1Benefits(spellObj: any): string {
    // Extract the first level benefits based on the lineage
    if (spellObj.name === 'Drow') {
      return 'The range of your Darkvision increases to 120 feet. You also know the Dancing Lights cantrip.';
    } else if (spellObj.name === 'High Elf') {
      return 'You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.';
    } else if (spellObj.name === 'Wood Elf') {
      return 'Your Speed increases to 35 feet. You also know the Druidcraft cantrip.';
    }
    
    return `You gain special abilities as part of the ${spellObj.name} lineage.`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractSpellProgression(spellObj: any): DndSpellProgression | undefined {
    // Handle spellcasting ability choice
    let spellcastingAbility: DndSpellProgression['spellcastingAbility'];
    if (spellObj.ability?.choose && Array.isArray(spellObj.ability.choose)) {
      // Expand abbreviations to full ability names
      const expandedAbilities = spellObj.ability.choose.map((abbr: string) => expandSpellcastingAbility(abbr));
      spellcastingAbility = { choice: expandedAbilities };
    } else {
      // Default choice
      spellcastingAbility = { choice: ['intelligence', 'wisdom', 'charisma'] };
    }

    const progression: DndSpellProgression = { spellcastingAbility };

    // Extract cantrips
    if (spellObj.known && spellObj.known['1']) {
      const cantrips = [];
      const level1Spells = spellObj.known['1'];
      
      if (Array.isArray(level1Spells)) {
        for (const spell of level1Spells) {
          cantrips.push({
            spell: this.generateSpellRef(spell),
            replaceable: false
          });
        }
      } else if (level1Spells._ && Array.isArray(level1Spells._)) {
        // Handle choice format like {"_": [{"choose": "level=0|class=Wizard"}]}
        for (const choice of level1Spells._) {
          if (choice.choose) {
            cantrips.push({
              spell: this.generateSpellRef('prestidigitation'), // Default
              replaceable: true,
              replacementOptions: {
                filter: choice.choose,
                description: 'Any cantrip from the Wizard spell list'
              }
            });
          }
        }
      }
      
      if (cantrips.length > 0) {
        progression.cantrips = cantrips;
      }
    }

    // Extract spells by level
    if (spellObj.innate) {
      const spellsByLevel: Record<string, Array<{
        spell: SpellReferenceObject;
        dailyUses: number;
        usageDescription: string;
      }>> = {};
      
      for (const [level, spells] of Object.entries(spellObj.innate)) {
        if (typeof spells === 'object' && spells && 'daily' in spells) {
          const dailySpells = (spells as Record<string, unknown>).daily as Record<string, string[]>;
          if (dailySpells?.['1'] && Array.isArray(dailySpells['1'])) {
            spellsByLevel[level] = dailySpells['1'].map((spell: string) => ({
              spell: this.generateSpellRef(spell),
              dailyUses: 1,
              usageDescription: 'Once per long rest'
            }));
          }
        }
      }
      
      if (Object.keys(spellsByLevel).length > 0) {
        progression.spellsByLevel = spellsByLevel;
      }
    }

    return Object.keys(progression).length > 1 ? progression : undefined; // More than just spellcastingAbility
  }

  private generateSpellRef(spellName: string): SpellReferenceObject {
    // Clean up spell name and generate reference
    const cleanName = spellName.replace(/\|.*$/, '').replace(/#.*$/, '');
    return {
      _ref: {
        documentType: 'vtt-document' as const,
        pluginDocumentType: 'spell' as const,
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        source: 'XPHB'
        // _id will be populated when documents are resolved
      }
    };
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
    
    // Extract actual traits from the entries field (where the real XPHB traits are)
    if (input.entries && Array.isArray(input.entries)) {
      for (const entry of input.entries) {
        if (entry && typeof entry === 'object' && 'name' in entry && 'entries' in entry) {
          const entryObj = entry as { name: string; entries: EtoolsEntry[] };
          const description = processEntries(entryObj.entries, this.options.textProcessing).text;
          
          traits.push({
            name: entryObj.name,
            description
          });
        }
      }
    }
    
    return traits;
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


}
/**
 * Monster converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsMonster, EtoolsMonsterData, EtoolsMonsterAction, EtoolsMonsterSaves, EtoolsMonsterDamageType } from '../../5etools-types/monsters.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
// Import monster schema and utilities
import { DndCreatureData } from '../../types/dnd/index.mjs';
import type { DamageType } from '../../types/dnd/common.mjs';
import { DAMAGE_TYPES_2024 } from '../../types/dnd/common.mjs';
import { ReferenceObject } from '@dungeon-lab/shared/types/index.mjs';
// Import reference processing utilities
import {
  transformGearArray,
  transformSpellcastingToSchema,
  transformConditionImmunities,
  transformMonsterEntries,
  parseActionData,
} from '../utils/reference-transformer.mjs';

// Monster data will use the stat block structure

/**
 * Monster fluff data interface
 */
interface EtoolsMonsterFluff {
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
  _copy?: {
    _mod?: {
      images?: {
        items?: Array<{
          href: {
            path: string;
          };
        }>;
      };
    };
  };
}

/**
 * Monster fluff data file structure
 */
interface EtoolsMonsterFluffData {
  monsterFluff?: EtoolsMonsterFluff[];
}

// Size mapping from 5etools to our schema
const SIZE_MAP: Record<string, 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'> = {
  T: 'tiny',
  S: 'small',
  M: 'medium',
  L: 'large',
  H: 'huge',
  G: 'gargantuan'
};

export class MonsterWrapperConverter extends WrapperConverter {
  async convert(): Promise<WrapperConversionResult> {
    try {
      this.log('Starting monster wrapper conversion...');
      
      const content: WrapperContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read monster data files
      const monsterFiles = [
        { data: 'bestiary/bestiary-xphb.json', fluff: 'bestiary/fluff-bestiary-xphb.json' },
        { data: 'bestiary/bestiary-xmm.json', fluff: 'bestiary/fluff-bestiary-xmm.json' }
      ];

      for (const fileSet of monsterFiles) {
        try {
          // Read monster and fluff data
          const rawMonsterData = await readEtoolsData(fileSet.data);
          const monsterData = safeEtoolsCast<EtoolsMonsterData>(rawMonsterData, ['monster'], `monster data file ${fileSet.data}`);
          const rawFluffData = await readEtoolsData(fileSet.fluff);
          const fluffData = safeEtoolsCast<EtoolsMonsterFluffData>(rawFluffData, [], `monster fluff file ${fileSet.fluff}`);

          // Create fluff lookup map
          const fluffMap = new Map<string, EtoolsMonsterFluff>();
          if (fluffData.monsterFluff) {
            for (const fluff of fluffData.monsterFluff) {
              fluffMap.set(fluff.name, fluff);
            }
          }

          // Process monsters
          const monsters = extractEtoolsArray<EtoolsMonster>(monsterData, 'monster', `monster list in ${fileSet.data}`);
          const filteredMonsters = this.options.srdOnly ? filterSrdContent(monsters) : monsters;
          
          stats.total += filteredMonsters.length;
          this.log(`Processing ${filteredMonsters.length} monsters from ${fileSet.data}`);

          for (let i = 0; i < filteredMonsters.length; i++) {
            const monsterRaw = filteredMonsters[i];
            try {
              const fluff = fluffMap.get(monsterRaw.name);
              const { monster, assetPath } = await this.convertMonster(monsterRaw, fluff);
              // Monster is already properly typed for wrapper creation

              // Create wrapper format
              const wrapper = this.createWrapper(
                monster.name,
                monster,
                'actor',
                {
                  imageId: assetPath,
                  category: this.determineCategory(monsterRaw, 'actor'),
                  tags: this.extractTags(monsterRaw, 'actor'),
                  sortOrder: this.calculateSortOrder(monsterRaw, 'actor') + i // Add index to ensure unique ordering
                }
              );
              
              content.push({
                type: 'actor',
                wrapper,
                originalPath: fileSet.data
              });
              
              stats.converted++;
            } catch (error) {
              this.log(`❌ ${monsterRaw.name}: ${error instanceof Error ? error.message : 'Conversion error'}`);
              stats.errors++;
            }
          }
        } catch (error) {
          this.log(`Error processing file set ${fileSet.data}:`, error);
          stats.errors++;
        }
      }

      this.log(`Monster wrapper conversion complete. Stats:`, stats);
      
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

  private async convertMonster(monsterData: EtoolsMonster, fluffData?: EtoolsMonsterFluff): Promise<{ monster: {
    id: string;
    name: string;
    slug: string;
    pluginId: string;
    documentType: string;
    description: string;
    campaignId: string;
    userData: Record<string, unknown>;
    pluginDocumentType: string;
    pluginData: unknown;
  }; assetPath?: string }> {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      } else if (fluffData._copy?._mod?.images?.items?.[0]?.href?.path) {
        assetPath = fluffData._copy._mod.images.items[0].href.path;
      }
      
      // If no fluff image, leave assetPath as undefined
      // We don't want invalid placeholder paths in the output
    }

    // Convert the monster data to DndCreatureData structure
    const monster: DndCreatureData = {
      // Basic Information
      name: monsterData.name,
      size: SIZE_MAP[monsterData.size?.[0]] || 'medium',
      type: this.buildTypeString(monsterData.type),
      alignment: this.parseAlignment(monsterData.alignment),
      
      // Core Stats
      armorClass: this.parseACToSchema(monsterData.ac),
      hitPoints: this.parseHPToSchema(monsterData.hp),
      speed: this.parseSpeedToSchema(monsterData.speed),
      abilities: {
        strength: monsterData.str || 10,
        dexterity: monsterData.dex || 10,
        constitution: monsterData.con || 10,
        intelligence: monsterData.int || 10,
        wisdom: monsterData.wis || 10,
        charisma: monsterData.cha || 10
      },
      
      // Combat & Skills
      proficiencyBonus: this.calculateProficiencyBonus(monsterData.cr || '0'),
      savingThrows: this.convertSavingThrows(monsterData.save),
      skills: monsterData.skill || undefined,
      
      // Resistances & Immunities (with proper typing)
      damageVulnerabilities: this.convertDamageTypesArray(monsterData.vulnerable),
      damageResistances: this.convertDamageTypesArray(monsterData.resist),
      damageImmunities: this.convertDamageTypesArray(monsterData.immune),
      conditionImmunities: monsterData.conditionImmune ? transformConditionImmunities(monsterData.conditionImmune) : undefined,
      
      // Senses & Communication
      senses: this.parseSensesToSchema(monsterData.senses, monsterData.passive),
      languages: monsterData.languages || undefined,
      
      // Challenge & Experience
      challengeRating: monsterData.cr || '0',
      experiencePoints: this.calculateExperiencePoints(monsterData.cr || '0'),
      
      // Features & Actions
      traits: this.convertTraits(monsterData.trait || []),
      actions: this.convertActions(monsterData.action || []),
      bonusActions: this.convertActions(monsterData.bonus || []),
      reactions: this.convertActions(monsterData.reaction || []),
      
      // Legendary Abilities
      legendaryActions: this.convertLegendaryActions(monsterData.legendary || []),
      legendaryActionCount: monsterData.legendary && monsterData.legendary.length > 0 ? 3 : undefined,
      legendaryResistance: this.parseLegendaryResistance(monsterData.trait),
      
      // Spellcasting - skipped for now due to complex schema requirements
      // spellcasting: monsterData.spellcasting ? transformSpellcastingToSchema(monsterData.spellcasting) : undefined,
      
      // Equipment/Gear
      equipment: monsterData.gear ? transformGearArray(monsterData.gear) : undefined,
      
      // Monster-specific fields (from dndMonsterSpecificSchema)
      environment: monsterData.environment || undefined,
      tags: this.parseMonsterTags(monsterData.type),
      description: this.buildDescription(monsterData, fluffData)
    };

    // Create full document structure for output
    const monsterDocument = {
      id: `monster-${this.generateSlug(monsterData.name)}`,
      name: monsterData.name,
      slug: this.generateSlug(monsterData.name),
      pluginId: 'dnd-5e-2024',
      documentType: 'actor', // Monsters are actors
      description: this.buildDescription(monsterData, fluffData),
      campaignId: '',
      userData: {},
      pluginDocumentType: 'creature',
      pluginData: monster
    };

    return { monster: monsterDocument, assetPath };
  }

  private buildDescription(monsterData: EtoolsMonster, fluffData?: EtoolsMonsterFluff): string {
    let description = '';
    
    // Add fluff description if available
    if (fluffData?.entries) {
      description = formatEntries(fluffData.entries);
    }
    
    // Add basic monster info if no fluff
    if (!description) {
      const size = SIZE_MAP[monsterData.size?.[0]] || 'medium';
      const type = typeof monsterData.type === 'string' ? monsterData.type : monsterData.type?.type || 'creature';
      const cr = monsterData.cr || '0';
      description = `A ${size} ${type} of challenge rating ${cr}.`;
    }
    
    return description;
  }


  // New parsing methods for stat block schema
  private buildTypeString(type: EtoolsMonster['type']): string {
    if (typeof type === 'string') {
      return type;
    }
    if (typeof type === 'object' && type) {
      const base = type.type || 'humanoid';
      const tags = type.tags ? ` (${type.tags.join(', ')})` : '';
      return base + tags;
    }
    return 'humanoid';
  }

  private parseAlignment(alignment: EtoolsMonster['alignment']): string {
    if (Array.isArray(alignment)) {
      return alignment.join(' ').toLowerCase();
    }
    return 'neutral';
  }

  private parseACToSchema(ac: EtoolsMonster['ac']): { value: number; source?: string; notes?: string } {
    if (Array.isArray(ac) && ac.length > 0) {
      const first = ac[0];
      if (typeof first === 'number') {
        return { value: first };
      }
      if (typeof first === 'object' && first && 'ac' in first) {
        return {
          value: first.ac,
          source: first.from ? first.from.join(', ') : undefined,
          notes: first.condition || undefined
        };
      }
    }
    return { value: 10 };
  }

  private parseHPToSchema(hp: EtoolsMonster['hp']): { average: number; formula?: string; current?: number } {
    if (typeof hp === 'object' && hp) {
      return {
        average: hp.average || 1,
        formula: hp.formula,
        current: hp.average || 1 // Start at full HP
      };
    }
    return { average: 1, current: 1 };
  }

  private parseSpeedToSchema(speed: EtoolsMonster['speed']): { walk?: number; fly?: number; swim?: number; climb?: number; burrow?: number; hover?: boolean } {
    if (typeof speed === 'object' && speed) {
      // Handle complex fly speed objects from 5etools
      let flySpeed: number | undefined;
      let canHover = false;
      
      if (typeof speed.fly === 'number') {
        flySpeed = speed.fly;
      } else if (typeof speed.fly === 'object' && speed.fly && 'number' in speed.fly) {
        const flyObj = speed.fly as { number: number; condition?: string };
        flySpeed = flyObj.number;
        canHover = flyObj.condition?.includes('hover') || false;
      }
      
      return {
        walk: speed.walk || undefined,
        fly: flySpeed,
        swim: speed.swim || undefined,
        climb: speed.climb || undefined,
        burrow: speed.burrow || undefined,
        hover: canHover || speed.hover || speed.canHover || undefined
      };
    }
    return { walk: 30 };
  }

  // @ts-expect-error - Future functionality for legacy damage type parsing
  private parseDamageTypes(damages?: (string | { [key: string]: string[] | string })[]): string[] | undefined {
    if (!damages || damages.length === 0) return undefined;
    
    const damageTypes: string[] = [];
    
    for (const damage of damages) {
      if (typeof damage === 'string') {
        damageTypes.push(damage);
      } else if (typeof damage === 'object') {
        // Extract damage types from object keys
        Object.keys(damage).forEach(key => damageTypes.push(key));
      }
    }
    
    // Filter and normalize damage types to match our enum
    const validTypes = damageTypes.filter(damage => {
      const normalized = damage.toLowerCase().trim();
      return ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
              'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'].includes(normalized);
    });
    
    return validTypes.length > 0 ? validTypes : undefined;
  }

  private parseSensesToSchema(senses: EtoolsMonster['senses'], passive?: number): { blindsight?: number; darkvision?: number; tremorsense?: number; truesight?: number; passivePerception: number; other?: string[] } | undefined {
    const result: { blindsight?: number; darkvision?: number; tremorsense?: number; truesight?: number; passivePerception: number; other?: string[] } = {
      passivePerception: passive || 10
    };

    if (Array.isArray(senses)) {
      const other: string[] = [];
      
      for (const sense of senses) {
        if (typeof sense === 'string') {
          const lower = sense.toLowerCase();
          if (lower.includes('darkvision')) {
            const match = sense.match(/(\d+)/);
            if (match) result.darkvision = parseInt(match[1], 10);
          } else if (lower.includes('blindsight')) {
            const match = sense.match(/(\d+)/);
            if (match) result.blindsight = parseInt(match[1], 10);
          } else if (lower.includes('tremorsense')) {
            const match = sense.match(/(\d+)/);
            if (match) result.tremorsense = parseInt(match[1], 10);
          } else if (lower.includes('truesight')) {
            const match = sense.match(/(\d+)/);
            if (match) result.truesight = parseInt(match[1], 10);
          } else {
            other.push(sense);
          }
        }
      }
      
      if (other.length > 0) result.other = other;
    }

    return result;
  }

  private calculateExperiencePoints(cr: string | number): number {
    const xpTable: Record<string, number> = {
      '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
      '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
      '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
      '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
      '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
      '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
      '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000
    };
    
    const crStr = cr.toString();
    return xpTable[crStr] || 0;
  }

  private convertLegendaryActions(legendary: EtoolsMonsterAction[]): Array<{ name: string; description: string; cost?: number }> {
    return legendary.map(action => {
      const entries = action.entries || [];
      const description = formatEntries(entries);
      
      // Try to parse cost from name or description
      let cost = 1; // Default cost
      if (action.name.includes('(Costs 2 Actions)')) {
        cost = 2;
      } else if (action.name.includes('(Costs 3 Actions)')) {
        cost = 3;
      }
      
      return {
        name: action.name.replace(/\s*\(Costs \d+ Actions?\)/, ''), // Clean up name
        description,
        cost: cost > 1 ? cost : undefined
      };
    });
  }

  private parseLegendaryResistance(traits?: EtoolsMonsterAction[]): number | undefined {
    if (!traits) return undefined;
    
    for (const trait of traits) {
      if (trait.name.toLowerCase().includes('legendary resistance')) {
        const match = trait.entries?.[0]?.toString().match(/(\d+)\/day/i);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
    return undefined;
  }

  // @ts-expect-error - Future functionality for habitat parsing
  private parseHabitat(environment?: string[]): string[] | undefined {
    if (!environment || environment.length === 0) return undefined;
    
    // Map 5etools environments to our habitat enum
    const habitatMap: Record<string, string> = {
      'arctic': 'arctic',
      'coast': 'coastal', 
      'coastal': 'coastal',
      'desert': 'desert',
      'forest': 'forest',
      'grassland': 'grassland',
      'hill': 'hill',
      'mountain': 'mountain',
      'swamp': 'swamp',
      'underdark': 'underdark',
      'underwater': 'underwater',
      'urban': 'urban'
    };
    
    const mapped = environment.map(env => habitatMap[env.toLowerCase()]).filter(Boolean);
    return mapped.length > 0 ? mapped : undefined;
  }

  // @ts-expect-error - Future functionality for monster type parsing
  private parseMonsterType(type: EtoolsMonster['type']): string | undefined {
    if (typeof type === 'string') {
      return type;
    }
    if (typeof type === 'object' && type) {
      return type.type;
    }
    return undefined;
  }

  private parseMonsterTags(type: EtoolsMonster['type']): string[] | undefined {
    if (typeof type === 'object' && type && type.tags) {
      return type.tags;
    }
    return undefined;
  }


  private calculateProficiencyBonus(cr: string | number): number {
    const crNum = typeof cr === 'string' ? parseFloat(cr) : cr;
    if (crNum >= 17) return 6;
    if (crNum >= 13) return 5;
    if (crNum >= 9) return 4;
    if (crNum >= 5) return 3;
    return 2;
  }

  private convertTraits(traits: EtoolsMonsterAction[]): Array<{ 
    name: string; 
    description: string; 
    references?: ReferenceObject[] 
  }> {
    return traits.map(trait => {
      const entries = trait.entries || [];
      const transformResult = transformMonsterEntries(entries);
      
      return {
        name: trait.name,
        description: formatEntries(transformResult.entries),
        references: transformResult.references.length > 0 ? transformResult.references : undefined
      };
    });
  }

  private convertActions(actions: EtoolsMonsterAction[]): Array<{ 
    name: string; 
    description: string; 
    attackBonus?: number;
    damage?: string;
    damageType?: DamageType;
    savingThrow?: {
      ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
      dc: number;
    };
    recharge?: string;
    references?: ReferenceObject[] 
  }> {
    return actions.map(action => {
      const entries = action.entries || [];
      const fullText = formatEntries(entries);
      
      // Parse the action text for structured data
      const parsedData = parseActionData(fullText);
      
      // Extract recharge info from action name if present
      let cleanName = action.name;
      let recharge = parsedData.recharge;
      
      const rechargeMatch = action.name.match(/\{@recharge\s+(\d+)\}/);
      if (rechargeMatch) {
        const rechargeValue = rechargeMatch[1];
        recharge = this.convertRechargeValue(rechargeValue);
        cleanName = action.name.replace(/\s*\{@recharge\s+\d+\}/, '');
      }
      
      // If we found recharge in the text but not the name, add it to name for display
      if (recharge && !rechargeMatch) {
        cleanName = `${cleanName} (Recharge ${recharge})`;
      }
      
      return {
        name: cleanName,
        description: parsedData.description,
        attackBonus: parsedData.attackBonus,
        damage: parsedData.damage,
        damageType: this.convertDamageType(parsedData.damageType || ''),
        savingThrow: parsedData.savingThrow,
        recharge,
        references: parsedData.references.length > 0 ? parsedData.references : undefined
      };
    });
  }
  
  private convertDamageType(damageType: string): DamageType | undefined {
    if (!damageType) return undefined;
    
    const normalizedType = damageType.toLowerCase().trim() as DamageType;
    
    // Check if it's a valid damage type from our schema
    if (DAMAGE_TYPES_2024.includes(normalizedType)) {
      return normalizedType;
    }
    
    return undefined;
  }

  private convertDamageTypesArray(damageTypes: (string | EtoolsMonsterDamageType)[] | undefined): DamageType[] | undefined {
    if (!damageTypes || !Array.isArray(damageTypes)) return undefined;
    
    const converted = damageTypes
      .map(type => {
        // Handle both string and object formats from 5etools
        if (typeof type === 'string') {
          return this.convertDamageType(type);
        } else if (typeof type === 'object' && type) {
          // Handle EtoolsMonsterDamageType objects - extract damage type keys
          const damageTypeKeys = Object.keys(type);
          if (damageTypeKeys.length > 0) {
            return this.convertDamageType(damageTypeKeys[0]);
          }
        }
        return undefined;
      })
      .filter((type): type is DamageType => type !== undefined);
    
    return converted.length > 0 ? converted : undefined;
  }

  private convertSavingThrows(saves: EtoolsMonsterSaves | undefined): {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  } | undefined {
    if (!saves || typeof saves !== 'object') return undefined;
    
    const converted: {
      strength?: number;
      dexterity?: number;
      constitution?: number;
      intelligence?: number;
      wisdom?: number;
      charisma?: number;
    } = {};
    
    // Convert 5etools abbreviations to full names
    const abilityMap: Record<string, keyof typeof converted> = {
      str: 'strength',
      dex: 'dexterity',
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    
    for (const [key, value] of Object.entries(saves)) {
      const ability = abilityMap[key.toLowerCase()];
      if (ability && typeof value === 'string') {
        // Parse the modifier string (e.g., "+5" or "-1")
        const numValue = parseInt(value.replace(/[^-+\d]/g, ''), 10);
        if (!isNaN(numValue)) {
          converted[ability] = numValue;
        }
      }
    }
    
    return Object.keys(converted).length > 0 ? converted : undefined;
  }

  private convertRechargeValue(rechargeValue: string): string {
    const num = parseInt(rechargeValue, 10);
    if (num === 6) return '6';
    if (num >= 1 && num <= 5) return `${num}-6`;
    return rechargeValue;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

}
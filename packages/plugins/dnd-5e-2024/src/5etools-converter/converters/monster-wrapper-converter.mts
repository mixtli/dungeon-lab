/**
 * Monster converter for 5etools data to wrapper compendium format
 */
import { WrapperConverter, WrapperConversionResult, WrapperContent } from '../base/wrapper-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from '../utils/conversion-utils.mjs';
import type { EtoolsMonster, EtoolsMonsterData, EtoolsMonsterAction, EtoolsMonsterSpellcasting } from '../../5etools-types/monsters.mjs';
import type { EtoolsEntry } from '../../5etools-types/base.mjs';
import { extractEtoolsArray, safeEtoolsCast } from '../../5etools-types/type-utils.mjs';
// Import shared actor schema
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { z } from 'zod';

type IActor = z.infer<typeof actorSchema>;

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
              const { monster, assetPath } = this.convertMonster(monsterRaw, fluff);

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
              this.log(`Error converting monster ${monsterRaw.name}:`, error);
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

  private convertMonster(monsterData: EtoolsMonster, fluffData?: EtoolsMonsterFluff): { monster: IActor; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      } else if (fluffData._copy?._mod?.images?.items?.[0]?.href?.path) {
        assetPath = fluffData._copy._mod.images.items[0].href.path;
      }
      
      // If no fluff image, generate standard asset path
      if (!assetPath) {
        assetPath = this.generateAssetPath('bestiary', monsterData.name);
      }
    }

    // Convert the monster data
    const monster: IActor = {
      id: `monster-${this.generateSlug(monsterData.name)}`, // Temporary ID for wrapper format
      name: monsterData.name,
      type: 'npc',
      gameSystemId: 'dnd-5e-2024',
      description: this.buildDescription(monsterData, fluffData),
      
      // Avatar and token references (will be processed by import service)
      avatarId: assetPath,
      defaultTokenImageId: assetPath,
      
      // Monster-specific data
      data: {
        // Basic stats
        size: SIZE_MAP[monsterData.size?.[0]] || 'medium',
        type: typeof monsterData.type === 'string' ? monsterData.type : monsterData.type?.type || 'humanoid',
        subtype: typeof monsterData.type === 'object' && monsterData.type ? monsterData.type.tags?.join(', ') : undefined,
        alignment: Array.isArray(monsterData.alignment) 
          ? monsterData.alignment.join(' ')
          : 'neutral',
          
        // Ability scores
        abilities: {
          strength: monsterData.str || 10,
          dexterity: monsterData.dex || 10,
          constitution: monsterData.con || 10,
          intelligence: monsterData.int || 10,
          wisdom: monsterData.wis || 10,
          charisma: monsterData.cha || 10
        },
        
        // Combat stats
        armorClass: this.parseAC(monsterData.ac),
        hitPoints: this.parseHP(monsterData.hp),
        speed: monsterData.speed || { walk: 30 },
        challengeRating: monsterData.cr || '0',
        proficiencyBonus: this.calculateProficiencyBonus(monsterData.cr || '0'),
        
        // Skills and saves
        savingThrows: monsterData.save || {},
        skills: monsterData.skill || {},
        damageVulnerabilities: monsterData.vulnerable || [],
        damageResistances: monsterData.resist || [],
        damageImmunities: monsterData.immune || [],
        conditionImmunities: monsterData.conditionImmune || [],
        senses: Array.isArray(monsterData.senses) ? monsterData.senses : [],
        languages: monsterData.languages || [],
        
        // Features
        traits: this.convertTraits(monsterData.trait || []),
        actions: this.convertActions(monsterData.action || []),
        bonusActions: this.convertActions(monsterData.bonus || []),
        reactions: this.convertActions(monsterData.reaction || []),
        legendaryActions: this.convertActions(monsterData.legendary || []),
        
        // Spellcasting
        spellcasting: monsterData.spellcasting ? this.convertSpellcasting(monsterData.spellcasting) : undefined,
        
        // Source information
        source: monsterData.source || 'Unknown',
        page: monsterData.page
      }
    };

    return { monster, assetPath };
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private parseAC(ac: EtoolsMonster['ac']): number {
    if (Array.isArray(ac) && ac.length > 0) {
      const first = ac[0];
      if (typeof first === 'number') {
        return first;
      }
      if (typeof first === 'object' && first && 'ac' in first) {
        return first.ac;
      }
    }
    return 10; // Default AC
  }

  private parseHP(hp: EtoolsMonster['hp']): { average: number; formula?: string } {
    if (typeof hp === 'object' && hp) {
      return {
        average: hp.average || 1,
        formula: hp.formula
      };
    }
    return { average: 1 };
  }

  private calculateProficiencyBonus(cr: string | number): number {
    const crNum = typeof cr === 'string' ? parseFloat(cr) : cr;
    if (crNum >= 17) return 6;
    if (crNum >= 13) return 5;
    if (crNum >= 9) return 4;
    if (crNum >= 5) return 3;
    return 2;
  }

  private convertTraits(traits: EtoolsMonsterAction[]): Array<{ name: string; description: string }> {
    return traits.map(trait => ({
      name: trait.name,
      description: formatEntries(trait.entries || [])
    }));
  }

  private convertActions(actions: EtoolsMonsterAction[]): Array<{ name: string; description: string }> {
    return actions.map(action => ({
      name: action.name,
      description: formatEntries(action.entries || [])
    }));
  }

  private convertSpellcasting(spellcasting: EtoolsMonsterSpellcasting[]): {
    name: string;
    description: string;
    ability: string;
    level: number;
    spells: Record<string, unknown>;
  } | undefined {
    if (!spellcasting || spellcasting.length === 0) {
      return undefined;
    }
    
    const sc = spellcasting[0];
    return {
      name: sc.name || 'Spellcasting',
      description: formatEntries(sc.headerEntries || []),
      ability: sc.ability || 'int',
      level: 1, // Default level for monster spellcasting
      spells: sc.spells || {}
    };
  }
}
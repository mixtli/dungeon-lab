/**
 * Monster converter for 5etools data to compendium format
 */
import { BaseConverter, ConversionResult, ConvertedContent } from './base-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from './conversion-utils.mjs';
import { IMonster } from '../types/actor.mjs';

// Size mapping from 5etools to our schema
const SIZE_MAP: Record<string, 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'> = {
  T: 'tiny',
  S: 'small',
  M: 'medium',
  L: 'large',
  H: 'huge',
  G: 'gargantuan'
};

export class MonsterConverter extends BaseConverter {
  async convert(): Promise<ConversionResult> {
    try {
      this.log('Starting monster conversion...');
      
      const content: ConvertedContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read monster data files
      const monsterFiles = [
        { data: 'bestiary/bestiary-xphb.json', fluff: 'bestiary/fluff-bestiary-xphb.json' },
        { data: 'bestiary/bestiary-xmm.json', fluff: 'bestiary/fluff-bestiary-xmm.json' }
      ];

      for (const fileSet of monsterFiles) {
        try {
          // Read monster and fluff data
          const monsterData = await readEtoolsData(fileSet.data);
          const fluffData = await readEtoolsData(fileSet.fluff);

          // Create fluff lookup map
          const fluffMap = new Map();
          if (fluffData.monsterFluff) {
            for (const fluff of fluffData.monsterFluff) {
              fluffMap.set(fluff.name, fluff);
            }
          }

          // Process monsters
          const monsters = monsterData.monster || [];
          const filteredMonsters = this.options.srdOnly ? filterSrdContent(monsters) : monsters;
          
          stats.total += filteredMonsters.length;
          this.log(`Processing ${filteredMonsters.length} monsters from ${fileSet.data}`);

          for (const monsterRaw of filteredMonsters) {
            try {
              const fluff = fluffMap.get(monsterRaw.name);
              const { monster, assetPath } = this.convertMonster(monsterRaw, fluff);
              
              content.push({
                type: 'actor',
                subtype: 'npc',
                name: monster.name,
                data: monster,
                originalPath: fileSet.data,
                assetPath
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

      this.log(`Monster conversion complete. Stats:`, stats);
      
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

  private convertMonster(monsterData: any, fluffData?: any): { monster: IMonster; assetPath?: string } {
    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      } else if (fluffData._copy?._mod?.images?.items?.[0]?.href?.path) {
        assetPath = fluffData._copy._mod.images.items[0].href.path;
      }
    }

    // Handle size being an array
    const size = Array.isArray(monsterData.size) ? monsterData.size[0] : monsterData.size;

    // Handle CR being a string or fraction
    let cr: number;
    if (typeof monsterData.cr === 'string') {
      if (monsterData.cr.includes('/')) {
        const [num, den] = monsterData.cr.split('/').map(Number);
        cr = num / den;
      } else {
        cr = parseFloat(monsterData.cr);
      }
    } else {
      cr = monsterData.cr || 0;
    }

    const monster: IMonster = {
      name: monsterData.name || '',
      size: SIZE_MAP[size] || 'medium',
      type: this.normalizeMonsterType(monsterData.type),
      alignment: this.normalizeAlignment(monsterData.alignment),
      armorClass: this.normalizeArmorClass(monsterData.ac),
      hitPoints: this.normalizeHitPoints(monsterData.hp),
      speed: this.normalizeSpeed(monsterData.speed),
      abilities: this.normalizeAbilities(monsterData),
      savingThrows: this.normalizeSavingThrows(monsterData.save),
      skills: this.normalizeSkills(monsterData.skill),
      senses: this.normalizeSenses(monsterData.senses),
      languages: this.normalizeLanguages(monsterData.languages),
      challengeRating: cr,
      xp: monsterData.xp,
      traits: this.normalizeTraits(monsterData.trait),
      actions: this.normalizeActions(monsterData.action),
      reactions: this.normalizeReactions(monsterData.reaction),
      legendaryActions: this.normalizeLegendaryActions(monsterData.legendary),
      resistances: this.normalizeResistances(monsterData.resist),
      immunities: this.normalizeImmunities(monsterData.immune),
      vulnerabilities: this.normalizeVulnerabilities(monsterData.vulnerable),
      conditionImmunities: this.normalizeConditionImmunities(monsterData.conditionImmune)
    };

    return { monster, assetPath };
  }

  private normalizeMonsterType(typeData: any): string {
    if (!typeData) return '';
    
    if (typeof typeData === 'string') {
      return typeData.toLowerCase();
    }
    
    if (typeof typeData === 'object') {
      const mainType = (typeData.type || '').toLowerCase();
      const tags = Array.isArray(typeData.tags) ? typeData.tags.map((t: any) => t.toLowerCase()).join(', ') : '';
      return tags ? `${mainType} (${tags})` : mainType;
    }
    
    return '';
  }

  private normalizeAlignment(alignmentData: any): string {
    if (!alignmentData) return '';
    
    if (Array.isArray(alignmentData)) {
      return alignmentData.join(' ').toLowerCase();
    }
    
    return (alignmentData || '').toLowerCase();
  }

  private normalizeArmorClass(acData: any): IMonster['armorClass'] {
    if (Array.isArray(acData)) {
      return {
        value: acData[0] || 10,
        type: typeof acData[1] === 'string' ? acData[1].toLowerCase() : undefined
      };
    }
    
    return {
      value: acData || 10
    };
  }

  private normalizeHitPoints(hpData: any): IMonster['hitPoints'] {
    return {
      value: hpData?.average || 10,
      formula: hpData?.formula,
      current: hpData?.average || 10
    };
  }

  private normalizeSpeed(speedData: any): IMonster['speed'] {
    const speed: IMonster['speed'] = {};
    
    if (typeof speedData === 'number') {
      speed.walk = speedData;
    } else if (typeof speedData === 'object') {
      if (speedData.walk) speed.walk = speedData.walk;
      if (speedData.fly) speed.fly = typeof speedData.fly === 'object' ? speedData.fly.number : speedData.fly;
      if (speedData.swim) speed.swim = speedData.swim;
      if (speedData.climb) speed.climb = speedData.climb;
      if (speedData.burrow) speed.burrow = speedData.burrow;
    }
    
    return speed;
  }

  private normalizeAbilities(monsterData: any): IMonster['abilities'] {
    return {
      strength: monsterData.str || 10,
      dexterity: monsterData.dex || 10,
      constitution: monsterData.con || 10,
      intelligence: monsterData.int || 10,
      wisdom: monsterData.wis || 10,
      charisma: monsterData.cha || 10
    };
  }

  private normalizeSavingThrows(saveData: any): IMonster['savingThrows'] | undefined {
    if (!saveData) return undefined;
    
    const saves: Record<string, number> = {};
    for (const [ability, bonus] of Object.entries(saveData)) {
      const key = ability.toLowerCase();
      const value = typeof bonus === 'string' ? parseInt(bonus) : bonus as number;
      if (!isNaN(value)) {
        saves[key] = value;
      }
    }
    
    return Object.keys(saves).length ? saves : undefined;
  }

  private normalizeSkills(skillData: any): Record<string, number> | undefined {
    if (!skillData) return undefined;
    
    const skills: Record<string, number> = {};
    for (const [skill, bonus] of Object.entries(skillData)) {
      const key = skill.toLowerCase();
      const value = typeof bonus === 'string' ? parseInt(bonus) : bonus as number;
      if (!isNaN(value)) {
        skills[key] = value;
      }
    }
    
    return Object.keys(skills).length ? skills : undefined;
  }

  private normalizeSenses(sensesData: any): IMonster['senses'] | undefined {
    if (!Array.isArray(sensesData)) return undefined;
    
    const senses: IMonster['senses'] = {};
    
    for (const sense of sensesData) {
      const senseStr = typeof sense === 'string' ? sense : '';
      const match = senseStr.match(/(\w+)\s+(\d+)/);
      
      if (match) {
        const [, type, range] = match;
        const value = parseInt(range);
        
        switch (type.toLowerCase()) {
          case 'darkvision':
            senses.darkvision = value;
            break;
          case 'blindsight':
            senses.blindsight = value;
            break;
          case 'tremorsense':
            senses.tremorsense = value;
            break;
          case 'truesight':
            senses.truesight = value;
            break;
        }
      }
    }
    
    return Object.keys(senses).length ? senses : undefined;
  }

  private normalizeLanguages(languagesData: any): string[] | undefined {
    if (!Array.isArray(languagesData)) return undefined;
    return languagesData.map(lang => typeof lang === 'string' ? lang.toLowerCase() : '').filter(Boolean);
  }

  private normalizeTraits(traitsData: any[]): IMonster['traits'] | undefined {
    if (!Array.isArray(traitsData)) return undefined;
    
    return traitsData.map(trait => ({
      name: trait.name || '',
      description: this.cleanRuleText(formatEntries(trait.entries || []))
    }));
  }

  private normalizeActions(actionsData: any[]): IMonster['actions'] | undefined {
    if (!Array.isArray(actionsData)) return undefined;
    
    return actionsData.map(action => ({
      name: action.name || '',
      description: this.cleanRuleText(formatEntries(action.entries || []))
    }));
  }

  private normalizeReactions(reactionsData: any[]): IMonster['reactions'] | undefined {
    if (!Array.isArray(reactionsData)) return undefined;
    
    return reactionsData.map(reaction => ({
      name: reaction.name || '',
      description: this.cleanRuleText(formatEntries(reaction.entries || []))
    }));
  }

  private normalizeLegendaryActions(legendaryData: any[]): IMonster['legendaryActions'] | undefined {
    if (!Array.isArray(legendaryData)) return undefined;
    
    return legendaryData.map(action => ({
      name: action.name || '',
      description: this.cleanRuleText(formatEntries(action.entries || []))
    }));
  }

  private normalizeResistances(resistData: any): string[] | undefined {
    if (!Array.isArray(resistData)) return undefined;
    return resistData.map(r => typeof r === 'string' ? r.toLowerCase() : '').filter(Boolean);
  }

  private normalizeImmunities(immuneData: any): string[] | undefined {
    if (!Array.isArray(immuneData)) return undefined;
    return immuneData.map(i => typeof i === 'string' ? i.toLowerCase() : '').filter(Boolean);
  }

  private normalizeVulnerabilities(vulnerData: any): string[] | undefined {
    if (!Array.isArray(vulnerData)) return undefined;
    return vulnerData.map(v => typeof v === 'string' ? v.toLowerCase() : '').filter(Boolean);
  }

  private normalizeConditionImmunities(condData: any): string[] | undefined {
    if (!Array.isArray(condData)) return undefined;
    return condData.map(c => typeof c === 'string' ? c.toLowerCase() : '').filter(Boolean);
  }
}
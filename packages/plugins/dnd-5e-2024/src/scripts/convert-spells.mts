/**
 * Spell converter for 5etools data to compendium format
 */
import { BaseConverter, ConversionResult, ConvertedContent } from './base-converter.mjs';
import { readEtoolsData, filterSrdContent, formatEntries } from './conversion-utils.mjs';
import { ISpell } from '../types/spell.mjs';

// Map for converting school abbreviations to full names
const SCHOOL_MAP: Record<string, string> = {
  A: 'abjuration',
  C: 'conjuration', 
  D: 'divination',
  E: 'enchantment',
  V: 'evocation',
  I: 'illusion',
  N: 'necromancy',
  T: 'transmutation'
};

// Map for converting damage types
const DAMAGE_TYPE_MAP: Record<string, string> = {
  acid: 'acid',
  bludgeoning: 'bludgeoning',
  cold: 'cold',
  fire: 'fire',
  force: 'force', 
  lightning: 'lightning',
  necrotic: 'necrotic',
  piercing: 'piercing',
  poison: 'poison',
  psychic: 'psychic',
  radiant: 'radiant',
  slashing: 'slashing',
  thunder: 'thunder'
};

export class SpellConverter extends BaseConverter {
  async convert(): Promise<ConversionResult> {
    try {
      this.log('Starting spell conversion...');
      
      const content: ConvertedContent[] = [];
      const stats = { total: 0, converted: 0, skipped: 0, errors: 0 };

      // Read spell and fluff data
      const spellData = await readEtoolsData('spells/spells-xphb.json');
      const fluffData = await readEtoolsData('spells/fluff-spells-xphb.json');
      
      // Create fluff lookup map
      const fluffMap = new Map();
      if (fluffData.spellFluff) {
        for (const fluff of fluffData.spellFluff) {
          fluffMap.set(fluff.name, fluff);
        }
      }
      
      const spells = spellData.spell || [];
      const filteredSpells = this.options.srdOnly ? filterSrdContent(spells) : spells;
      
      stats.total = filteredSpells.length;
      this.log(`Processing ${filteredSpells.length} spells`);

      for (const spellRaw of filteredSpells) {
        try {
          const fluff = fluffMap.get(spellRaw.name);
          const { spell, assetPath } = this.convertSpell(spellRaw, fluff);
          
          content.push({
            type: 'document',
            subtype: 'spell',
            name: spell.name,
            data: spell,
            originalPath: 'spells/spells-xphb.json',
            assetPath
          });
          
          stats.converted++;
        } catch (error) {
          this.log(`Error converting spell ${spellRaw.name}:`, error);
          stats.errors++;
        }
      }

      this.log(`Spell conversion complete. Stats:`, stats);
      
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

  private convertSpell(spellData: any, fluffData?: any): { spell: ISpell; assetPath?: string } {
    const spell: ISpell = {
      name: spellData.name || '',
      level: spellData.level || 0,
      school: SCHOOL_MAP[spellData.school] || spellData.school || 'evocation',
      castingTime: this.formatCastingTime(spellData.time),
      range: this.formatRange(spellData.range),
      components: this.formatComponents(spellData.components),
      duration: this.formatDuration(spellData.duration),
      description: this.cleanRuleText(formatEntries(spellData.entries || [])),
      higherLevelDescription: this.formatHigherLevels(spellData.entriesHigherLevel),
      ritual: spellData.meta?.ritual === true,
      concentration: spellData.duration?.some((d: any) => d.concentration === true) || false,
      classes: this.extractClasses(spellData.classes),
      source: spellData.source || 'XPHB',
      page: spellData.page
    };

    // Add damage information if present
    if (spellData.damageInflict) {
      spell.damageType = Array.isArray(spellData.damageInflict) 
        ? spellData.damageInflict.map((d: string) => DAMAGE_TYPE_MAP[d] || d)
        : [DAMAGE_TYPE_MAP[spellData.damageInflict] || spellData.damageInflict];
    }

    // Add saving throw information if present
    if (spellData.savingThrow) {
      spell.savingThrow = Array.isArray(spellData.savingThrow)
        ? spellData.savingThrow.map((st: string) => this.mapAbility(st))
        : [this.mapAbility(spellData.savingThrow)];
    }

    // Add scaling information if present
    if (spellData.scalingLevelDice) {
      spell.scaling = this.formatScaling(spellData.scalingLevelDice);
    }

    // Extract asset path from fluff data if available
    let assetPath: string | undefined;
    if (fluffData && this.options.includeAssets) {
      if (fluffData.images?.[0]?.href?.path) {
        assetPath = fluffData.images[0].href.path;
      }
    }

    return { spell, assetPath };
  }

  private formatCastingTime(timeData: any): string {
    if (!Array.isArray(timeData) || timeData.length === 0) {
      return '1 action';
    }

    const time = timeData[0];
    if (typeof time === 'object') {
      const number = time.number || 1;
      const unit = time.unit || 'action';
      
      if (number === 1) {
        switch (unit) {
          case 'action': return '1 action';
          case 'bonus': return '1 bonus action';
          case 'reaction': return '1 reaction';
          case 'minute': return '1 minute';
          case 'hour': return '1 hour';
          default: return `1 ${unit}`;
        }
      } else {
        return `${number} ${unit}s`;
      }
    }
    
    return time?.toString() || '1 action';
  }

  private formatRange(rangeData: any): string {
    if (!rangeData) return 'Self';
    
    if (typeof rangeData === 'string') return rangeData;
    
    if (rangeData.type) {
      switch (rangeData.type) {
        case 'point':
          if (rangeData.distance) {
            const distance = rangeData.distance;
            return `${distance.amount} ${distance.type}`;
          }
          return 'Touch';
        case 'line':
          return `Self (${rangeData.distance?.amount || 30}-foot line)`;
        case 'cone':
          return `Self (${rangeData.distance?.amount || 15}-foot cone)`;
        case 'cube':
          return `Self (${rangeData.distance?.amount || 5}-foot cube)`;
        case 'sphere':
          return `Self (${rangeData.distance?.amount || 20}-foot radius)`;
        case 'hemisphere':
          return `Self (${rangeData.distance?.amount || 10}-foot hemisphere)`;
        default:
          return rangeData.type;
      }
    }
    
    return 'Self';
  }

  private formatComponents(componentsData: any): ISpell['components'] {
    if (!componentsData) {
      return { verbal: false, somatic: false, material: false };
    }

    return {
      verbal: componentsData.v === true,
      somatic: componentsData.s === true,
      material: componentsData.m !== undefined,
      materialDescription: typeof componentsData.m === 'string' ? componentsData.m : undefined
    };
  }

  private formatDuration(durationData: any): string {
    if (!Array.isArray(durationData) || durationData.length === 0) {
      return 'Instantaneous';
    }

    const duration = durationData[0];
    if (typeof duration === 'object') {
      if (duration.type === 'instant') {
        return 'Instantaneous';
      } else if (duration.type === 'permanent') {
        return 'Until dispelled';
      } else if (duration.type === 'timed') {
        const amount = duration.duration?.amount || 1;
        const type = duration.duration?.type || 'minute';
        const concentration = duration.concentration ? ', concentration' : '';
        return `${amount} ${type}${amount > 1 ? 's' : ''}${concentration}`;
      }
    }
    
    return duration?.toString() || 'Instantaneous';
  }

  private formatHigherLevels(higherLevelData: any): string | undefined {
    if (!Array.isArray(higherLevelData) || higherLevelData.length === 0) {
      return undefined;
    }

    return this.cleanRuleText(formatEntries(higherLevelData[0].entries || []));
  }

  private extractClasses(classesData: any): string[] {
    if (!classesData?.fromClassList) return [];
    
    return classesData.fromClassList.map((cls: any) => {
      if (typeof cls === 'string') return cls.toLowerCase();
      if (cls.name) return cls.name.toLowerCase();
      return '';
    }).filter(Boolean);
  }

  private mapAbility(ability: string): string {
    const map: Record<string, string> = {
      str: 'strength',
      dex: 'dexterity', 
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    return map[ability.toLowerCase()] || ability.toLowerCase();
  }

  private formatScaling(scalingData: any): ISpell['scaling'] {
    if (!scalingData?.scaling) return undefined;
    
    const scaling: Record<string, string> = {};
    for (const [level, dice] of Object.entries(scalingData.scaling)) {
      scaling[level] = dice as string;
    }
    
    return {
      formula: scaling,
      description: scalingData.label || 'Damage'
    };
  }
}
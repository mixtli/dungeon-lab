/* eslint-disable @typescript-eslint/no-explicit-any */
import { IMonster } from '../shared/types/actor.mjs';
import { toLowercase, cleanRuleText } from './converter-utils.mjs';

// Size mapping from 5etools to our schema
const SIZE_MAP: Record<string, 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'> = {
  T: 'tiny',
  S: 'small',
  M: 'medium',
  L: 'large',
  H: 'huge',
  G: 'gargantuan'
};

function normalizeSpeed(speedData: any): IMonster['speed'] {
  const speed: IMonster['speed'] = {};

  if (typeof speedData === 'number') {
    speed.walk = speedData;
  } else if (typeof speedData === 'object') {
    if (speedData.walk) speed.walk = speedData.walk;
    if (speedData.fly) speed.fly = speedData.fly;
    if (speedData.swim) speed.swim = speedData.swim;
    if (speedData.climb) speed.climb = speedData.climb;
    if (speedData.burrow) speed.burrow = speedData.burrow;
  }

  return speed;
}

function normalizeAbilities(monsterData: any): IMonster['abilities'] {
  return {
    strength: monsterData.str || 10,
    dexterity: monsterData.dex || 10,
    constitution: monsterData.con || 10,
    intelligence: monsterData.int || 10,
    wisdom: monsterData.wis || 10,
    charisma: monsterData.cha || 10
  };
}

function normalizeSavingThrows(saveData: any): IMonster['savingThrows'] | undefined {
  if (!saveData) return undefined;

  const saves: Record<string, number> = {};
  for (const [ability, bonus] of Object.entries(saveData)) {
    const key = toLowercase(ability);
    // Handle string bonuses like "+5"
    if (typeof bonus === 'string') {
      const value = parseInt(bonus);
      if (!isNaN(value)) {
        saves[key] = value;
      }
    } else if (typeof bonus === 'number') {
      saves[key] = bonus;
    }
  }

  return Object.keys(saves).length ? saves : undefined;
}

function normalizeSkills(skillData: any): Record<string, number> | undefined {
  if (!skillData) return undefined;

  const skills: Record<string, number> = {};
  for (const [skill, bonus] of Object.entries(skillData)) {
    const key = toLowercase(skill);
    // Handle string bonuses like "+5"
    if (typeof bonus === 'string') {
      const value = parseInt(bonus);
      if (!isNaN(value)) {
        skills[key] = value;
      }
    } else if (typeof bonus === 'number') {
      skills[key] = bonus;
    }
  }

  return Object.keys(skills).length ? skills : undefined;
}

function normalizeSenses(sensesData: any): IMonster['senses'] | undefined {
  if (!sensesData) return undefined;

  const senses: IMonster['senses'] = {};

  for (const sense of sensesData) {
    const [type, range] = sense.split(' ');
    const key = toLowercase(type);
    const value = parseInt(range);

    if (!isNaN(value)) {
      switch (key) {
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

function normalizeLanguages(languagesData: any): string[] | undefined {
  if (!Array.isArray(languagesData)) return undefined;
  return languagesData.map((lang) => toLowercase(lang));
}

function normalizeTraits(traitsData: any[]): IMonster['traits'] | undefined {
  if (!Array.isArray(traitsData)) return undefined;

  return traitsData.map((trait) => ({
    name: toLowercase(trait.name || ''),
    description: cleanRuleText(trait.entries?.join('\n') || '')
  }));
}

function normalizeActions(actionsData: any[]): IMonster['actions'] | undefined {
  if (!Array.isArray(actionsData)) return undefined;

  return actionsData.map((action) => {
    const normalized = {
      name: toLowercase(action.name || ''),
      description: cleanRuleText(action.entries?.join('\n') || '')
    } as {
      name: string;
      description: string;
      attackBonus?: number;
      damage?: string;
      damageType?: string;
    };

    // Extract attack bonus and damage if present
    if (action.attack) {
      const [bonus, damage] = action.attack;
      if (typeof bonus === 'number') {
        normalized.attackBonus = bonus;
      }
      if (typeof damage === 'string') {
        const [dmg, type] = damage.split(' ');
        normalized.damage = dmg;
        normalized.damageType = toLowercase(type);
      }
    }

    return normalized;
  });
}

function normalizeReactions(reactionsData: any[]): IMonster['reactions'] | undefined {
  if (!Array.isArray(reactionsData)) return undefined;

  return reactionsData.map((reaction) => ({
    name: toLowercase(reaction.name || ''),
    description: cleanRuleText(reaction.entries?.join('\n') || '')
  }));
}

function normalizeLegendaryActions(legendaryData: any[]): IMonster['legendaryActions'] | undefined {
  if (!Array.isArray(legendaryData)) return undefined;

  return legendaryData.map((action) => ({
    name: toLowercase(action.name || ''),
    description: cleanRuleText(action.entries?.join('\n') || '')
  }));
}

/**
 * Normalize monster type field which can be either a string or an object with type and tags
 * @param typeData Type data from 5etools monster
 * @returns Normalized type string
 */
function normalizeMonsterType(typeData: any): string {
  if (!typeData) return '';

  if (typeof typeData === 'string') {
    return toLowercase(typeData);
  }

  if (typeof typeData === 'object') {
    // Handle object format with type and tags
    const mainType = toLowercase(typeData.type || '');
    const tags = Array.isArray(typeData.tags) ? typeData.tags.map(toLowercase).join(', ') : '';

    return tags ? `${mainType} (${tags})` : mainType;
  }

  return '';
}

export function convert5eToolsMonster(
  monsterData: any,
  fluffData?: any
): { monster: IMonster; imagePath?: string } {
  // Extract image path from fluff data if available
  let imagePath: string | undefined;
  if (fluffData) {
    if (fluffData.images?.[0]?.href?.path) {
      imagePath = fluffData.images[0].href.path;
    } else if (fluffData._copy?._mod?.images?.items?.[0]?.href?.path) {
      imagePath = fluffData._copy._mod.images.items[0].href.path;
    }
  }

  // Handle size being an array
  const size = Array.isArray(monsterData.size) ? monsterData.size[0] : monsterData.size;

  // Handle CR being a string
  const cr = typeof monsterData.cr === 'string' ? parseFloat(monsterData.cr) : monsterData.cr || 0;

  const monster: IMonster = {
    name: toLowercase(monsterData.name || ''),
    size: SIZE_MAP[size] || 'medium',
    type: normalizeMonsterType(monsterData.type),
    alignment: toLowercase(
      Array.isArray(monsterData.alignment)
        ? monsterData.alignment.join(' ')
        : monsterData.alignment || ''
    ),
    armorClass: {
      value: Array.isArray(monsterData.ac) ? monsterData.ac[0] || 10 : monsterData.ac || 10,
      type:
        Array.isArray(monsterData.ac) && monsterData.ac[1]
          ? toLowercase(monsterData.ac[1])
          : undefined
    },
    hitPoints: {
      value: monsterData.hp?.average || 10,
      formula: monsterData.hp?.formula,
      current: monsterData.hp?.average || 10
    },
    speed: normalizeSpeed(monsterData.speed),
    abilities: normalizeAbilities(monsterData),
    savingThrows: normalizeSavingThrows(monsterData.save),
    skills: normalizeSkills(monsterData.skill),
    senses: normalizeSenses(monsterData.senses),
    languages: normalizeLanguages(monsterData.languages),
    challengeRating: cr,
    xp: monsterData.xp,
    traits: normalizeTraits(monsterData.trait),
    actions: normalizeActions(monsterData.action),
    reactions: normalizeReactions(monsterData.reaction),
    legendaryActions: normalizeLegendaryActions(monsterData.legendary)
  };

  return { monster, imagePath };
}

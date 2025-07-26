/**
 * TypeScript definitions for 5etools monster data structures
 */
import type { 
  EtoolsSource, 
  EtoolsEntry, 
  EtoolsAbility
} from './base.mjs';

/**
 * Monster size categories
 */
export type EtoolsMonsterSize = 'T' | 'S' | 'M' | 'L' | 'H' | 'G';

/**
 * Monster types
 */
export type EtoolsMonsterType = 'aberration' | 'beast' | 'celestial' | 'construct' | 'dragon' | 'elemental' | 'fey' | 'fiend' | 'giant' | 'humanoid' | 'monstrosity' | 'ooze' | 'plant' | 'undead';

/**
 * Monster ability scores
 */
export interface EtoolsMonsterAbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

/**
 * Monster armor class specification
 */
export interface EtoolsMonsterAC {
  ac: number;
  from?: string[];
  condition?: string;
}

/**
 * Monster hit points specification
 */
export interface EtoolsMonsterHP {
  average?: number;
  formula?: string;
  special?: string;
}

/**
 * Monster speed specification
 */
export interface EtoolsMonsterSpeed {
  walk?: number;
  fly?: number;
  swim?: number;
  climb?: number;
  burrow?: number;
  hover?: boolean;
  canHover?: boolean;
}

/**
 * Monster saving throws
 */
export interface EtoolsMonsterSaves {
  str?: string;
  dex?: string;
  con?: string;
  int?: string;
  wis?: string;
  cha?: string;
}

/**
 * Monster skills
 */
export interface EtoolsMonsterSkills {
  [skill: string]: string;
}

/**
 * Monster damage vulnerabilities, resistances, immunities
 */
export interface EtoolsMonsterDamageType {
  [damageType: string]: string[] | string;
}

/**
 * Monster senses
 */
export interface EtoolsMonsterSenses {
  darkvision?: number;
  blindsight?: number;
  tremorsense?: number;
  truesight?: number;
  blindsightBlind?: boolean;
  passive?: number;
}

/**
 * Monster action specification
 */
export interface EtoolsMonsterAction {
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Monster legendary action specification
 */
export interface EtoolsMonsterLegendaryAction {
  name: string;
  entries: EtoolsEntry[];
}

/**
 * Monster spell casting specification
 */
export interface EtoolsMonsterSpellcasting {
  name?: string;
  headerEntries?: EtoolsEntry[];
  ability?: EtoolsAbility;
  dc?: number;
  mod?: number;
  type?: string;
  spells?: {
    [level: string]: {
      spells: string[] | { [spell: string]: string };
      slots?: number;
      lower?: number;
      higher?: number;
    };
  };
  daily?: {
    [frequency: string]: string[];
  };
  will?: string[];
  ritual?: string[];
  rest?: {
    [restType: string]: string[];
  };
  charges?: {
    [spell: string]: number;
  };
  footerEntries?: EtoolsEntry[];
}

/**
 * Complete monster data structure from 5etools JSON
 */
export interface EtoolsMonster extends EtoolsSource {
  name: string;
  size: EtoolsMonsterSize[];
  type: string | {
    type: EtoolsMonsterType;
    tags?: string[];
  };
  alignment: string[];
  ac: EtoolsMonsterAC[];
  hp: EtoolsMonsterHP;
  speed: EtoolsMonsterSpeed;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  save?: EtoolsMonsterSaves;
  skill?: EtoolsMonsterSkills;
  senses?: string[] | EtoolsMonsterSenses;
  passive?: number;
  resist?: (string | EtoolsMonsterDamageType)[];
  immune?: (string | EtoolsMonsterDamageType)[];
  vulnerable?: (string | EtoolsMonsterDamageType)[];
  conditionImmune?: string[];
  languages?: string[];
  cr: string | number;
  pbNote?: string;
  trait?: EtoolsMonsterAction[];
  action?: EtoolsMonsterAction[];
  bonus?: EtoolsMonsterAction[];
  reaction?: EtoolsMonsterAction[];
  legendary?: EtoolsMonsterLegendaryAction[];
  legendaryHeader?: EtoolsEntry[];
  legendaryActions?: number;
  mythic?: EtoolsMonsterAction[];
  mythicHeader?: EtoolsEntry[];
  lair?: EtoolsEntry[];
  regionalEffects?: EtoolsEntry[];
  spellcasting?: EtoolsMonsterSpellcasting[];
  variant?: EtoolsEntry[];
  gear?: string[];
  dragonCastingColor?: string;
  environment?: string[];
  soundClip?: {
    type: string;
    path: string;
  };
  altArt?: Array<{
    name?: string;
    source?: string;
    page?: number;
  }>;
  tokenUrl?: string;
  fluff?: {
    entries?: EtoolsEntry[];
    images?: Array<{
      type: string;
      href: {
        type: string;
        path: string;
      };
    }>;
  };
  hasToken?: boolean;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
}

/**
 * Monster list data structure (root of monster JSON files)
 */
export interface EtoolsMonsterData {
  monster: EtoolsMonster[];
  _meta?: {
    sources?: Array<{
      json: string;
      abbreviation: string;
      full: string;
      url?: string;
      authors?: string[];
      convertedBy?: string[];
    }>;
    dateAdded?: number;
    dateLastModified?: number;
  };
}
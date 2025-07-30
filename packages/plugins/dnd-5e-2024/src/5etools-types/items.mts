/**
 * TypeScript definitions for 5etools item data structures
 */
import { z } from 'zod';
import type { 
  EtoolsSource, 
  EtoolsEntry
} from './base.mjs';

/**
 * Item types
 */
export type EtoolsItemType = 'A' | 'AT' | 'G' | 'GS' | 'INS' | 'LA' | 'M' | 'MA' | 'MNT' | 'P' | 'R' | 'RD' | 'RG' | 'S' | 'SC' | 'SHP' | 'T' | 'TAH' | 'TG' | 'VEH' | 'W' | 'WD';

/**
 * Item rarity
 */
export type EtoolsItemRarity = 'none' | 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact' | 'varies' | 'unknown';

/**
 * Item weight specification
 */
export type EtoolsItemWeight = number | string;

/**
 * Item value specification
 */
export interface EtoolsItemValue {
  coin?: string;
  value?: number;
}

/**
 * Item damage specification
 */
export interface EtoolsItemDamage {
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
}

/**
 * Item range specification
 */
export interface EtoolsItemRange {
  short?: number;
  long?: number;
}

/**
 * Item properties
 */
export interface EtoolsItemProperties {
  [property: string]: boolean | number | string;
}

/**
 * Item armor class specification
 */
export interface EtoolsItemAC {
  ac: number;
  from?: string[];
}

/**
 * Item modifier specification
 */
export interface EtoolsItemModifier {
  mode?: string;
  "+": Record<string, number | string>;
}

/**
 * Complete item data structure from 5etools JSON
 */
export interface EtoolsItem extends EtoolsSource {
  name: string;
  type: EtoolsItemType;
  typeText?: string;
  rarity: EtoolsItemRarity;
  weight?: EtoolsItemWeight;
  value?: number | EtoolsItemValue;
  entries?: EtoolsEntry[];
  weaponCategory?: string;
  age?: string;
  property?: string[];
  range?: string | EtoolsItemRange;
  reload?: number;
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  damage?: EtoolsItemDamage;
  ac?: number | EtoolsItemAC;
  strength?: string;
  stealth?: boolean;
  tier?: string;
  bonus?: string;
  bonusWeapon?: string;
  bonusAc?: string;
  bonusSpellAttack?: string;
  bonusSpellDamage?: string;
  bonusSpellSaveDc?: string;
  bonusProficiencyBonus?: string;
  bonusAbilityCheck?: string;
  bonusSavingThrow?: string;
  grantsProficiency?: boolean;
  reqAttune?: boolean | string;
  reqAttuneTags?: string[];
  curse?: boolean;
  vulnerable?: string[];
  resist?: string[];
  immune?: string[];
  conditionImmune?: string[];
  charges?: number | string;
  recharge?: string;
  rechargeAmount?: number | string;
  crew?: number;
  vehAc?: number;
  vehHp?: number;
  vehDmgThresh?: number;
  vehSpeed?: number | {
    mode: string;
    speed?: number;
  }[];
  capCargo?: number;
  capPassenger?: number;
  cost?: number | EtoolsItemValue;
  hasRefs?: boolean;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  additionalSources?: EtoolsSource[];
  otherSources?: EtoolsSource[];
  reprintedAs?: string[];
  variants?: Array<{
    base: string;
    specificVariant: Record<string, unknown>;
    inherits: {
      entries?: EtoolsEntry[];
      namePrefix?: string;
      nameSuffix?: string;
      page?: number;
      source?: string;
    };
  }>;
  baseItem?: string;
  scfType?: string;
  wondrous?: boolean;
  tattoo?: boolean;
  sentient?: boolean;
  firearm?: boolean;
  weapon?: boolean;
  ammo?: boolean;
  armor?: boolean;
  shield?: boolean;
  focus?: string[];
  poisonTypes?: string[];
  staff?: boolean;
  wand?: boolean;
  rod?: boolean;
  miscellaneous?: boolean;
  atomicPackageTag?: string;
  packContents?: string[];
  containerCapacity?: {
    weight?: number | string;
    item?: number | string;
  };
  mastery?: string[];
  ammoType?: string;
  axe?: boolean;
  dagger?: boolean;
  hammer?: boolean;
  mace?: boolean;
  net?: boolean;
  spear?: boolean;
  sword?: boolean;
  bow?: boolean;
  crossbow?: boolean;
  sling?: boolean;
  club?: boolean;
  dart?: boolean;
  javelin?: boolean;
  light?: boolean;
  monk?: boolean;
  reach?: boolean;
  special?: boolean;
  thrown?: boolean;
  versatile?: boolean;
  loading?: boolean;
  finesse?: boolean;
  heavy?: boolean;
  twoHanded?: boolean;
  
  // Item group properties (for itemGroup entries)
  items?: string[]; // Array of item references like "Alchemist's Supplies|XPHB"
}

/**
 * Item list data structure (root of item JSON files)
 */
export interface EtoolsItemData {
  item?: EtoolsItem[];
  baseitem?: EtoolsItem[];
  magicvariant?: Array<{
    name: string;
    type: string;
    requires: Array<{
      armor?: boolean;
      weapon?: boolean;
      shield?: boolean;
      staff?: boolean;
      wand?: boolean;
      rod?: boolean;
      type?: string[];
      net?: boolean;
      tattoo?: boolean;
    }>;
    excludes?: Record<string, unknown>;
    entries: EtoolsEntry[];
    charges?: string;
    bonusWeapon?: string;
    bonusAc?: string;
    bonusSpellAttack?: string;
    bonusSpellDamage?: string;
    bonusSpellSaveDc?: string;
    rarity?: EtoolsItemRarity;
    source: string;
    page?: number;
  }>;
  itemGroup?: Array<{
    name: string;
    items: string[];
    source: string;
    page?: number;
  }>;
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

/**
 * Zod schema for 5etools item data validation - flexible to handle actual data structures
 */
export const etoolsItemSchema = z.object({
  name: z.string(),
  source: z.string(),
  page: z.number().optional(),
  
  // Item classification
  type: z.string().optional(), // Many magic items don't have explicit type
  typeText: z.string().optional(),
  rarity: z.string(),
  
  // Physical properties
  weight: z.union([z.number(), z.string()]).optional(),
  value: z.union([
    z.number(),
    z.object({
      coin: z.string().optional(),
      value: z.number().optional()
    })
  ]).optional(),
  
  // Weapon properties
  weaponCategory: z.string().optional(), // 'simple', 'martial'
  property: z.array(z.string()).optional(),
  range: z.union([
    z.string(), // "30/120"
    z.object({
      short: z.number().optional(),
      long: z.number().optional()
    })
  ]).optional(),
  reload: z.number().optional(),
  dmg1: z.string().optional(), // Primary damage
  dmg2: z.string().optional(), // Versatile damage
  dmgType: z.string().optional(),
  damage: z.object({
    dmg1: z.string().optional(),
    dmg2: z.string().optional(),
    dmgType: z.string().optional()
  }).optional(),
  
  // Armor properties
  ac: z.union([
    z.number(),
    z.object({
      ac: z.number(),
      from: z.array(z.string()).optional()
    })
  ]).optional(),
  strength: z.string().optional(),
  stealth: z.boolean().optional(),
  
  // Magic properties
  tier: z.string().optional(),
  bonus: z.string().optional(),
  bonusWeapon: z.string().optional(),
  bonusAc: z.string().optional(),
  bonusSpellAttack: z.string().optional(),
  bonusSpellDamage: z.string().optional(),
  bonusSpellSaveDc: z.string().optional(),
  reqAttune: z.union([z.boolean(), z.string()]).optional(),
  reqAttuneTags: z.array(z.any()).optional(),
  
  // 2024 properties
  mastery: z.array(z.string()).optional(),
  weapon: z.boolean().optional(),
  armor: z.boolean().optional(),
  shield: z.boolean().optional(),
  wondrous: z.boolean().optional(),
  firearm: z.boolean().optional(),
  focus: z.array(z.string()).optional(),
  
  // Content
  entries: z.array(z.any()).optional(),
  
  // Additional fields
  age: z.string().optional(),
  ammoType: z.string().optional(),
  edition: z.string().optional(),
  valueRarity: z.string().optional(),
  srd: z.boolean().optional(),
  srd52: z.boolean().optional(),
  basicRules: z.boolean().optional(),
  basicRules2024: z.boolean().optional(),
  reprintedAs: z.array(z.string()).optional(),
  
  // Item group properties
  items: z.array(z.string()).optional() // Array of item references
}).passthrough(); // Allow additional properties
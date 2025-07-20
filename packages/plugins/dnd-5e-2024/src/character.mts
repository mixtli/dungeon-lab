/**
 * D&D 5e Character Data Types
 */

export type ProficiencyLevel = 'none' | 'proficient' | 'expertise' | 'half';

export interface SkillData {
  ability: string;
  proficiency: ProficiencyLevel;
  modifiers: number[];
}

export interface AbilityScore {
  value: number;
}

export interface SavingThrow {
  proficient: boolean;
  bonus: number;
}

export interface RaceFeature {
  name: string;
  description: string;
}

export interface ClassFeature {
  name: string;
  description: string;
}

export interface CharacterClass {
  name: string;
  level: number;
  hitDie: number;
  features?: ClassFeature[];
}

export interface CharacterRace {
  name: string;
  size: string;
  features?: RaceFeature[];
}

export interface CharacterBackground {
  name: string;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
}

export interface HitPoints {
  current: number;
  maximum: number;
  temporary: number;
}

export interface ArmorClass {
  total: number;
  base: number;
  modifiers: number[];
}

export interface Initiative {
  bonus: number;
}

export interface Combat {
  speed: {
    walking: number;
  };
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface HitDice {
  current: number;
  maximum: number;
  type: string;
}

export interface SpellSlot {
  current: number;
  maximum: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  description: string;
}

export interface Spells {
  spellcastingAbility: string;
  spellAttackBonus: number;
  spellSaveDC: number;
  slots: Record<string, SpellSlot>;
  known: Spell[];
}

export interface Weapon {
  name: string;
  damage: string;
  damageType: string;
  properties: string[];
}

export interface Armor {
  name: string;
  ac: number;
  type: string;
}

export interface Item {
  name: string;
  quantity: number;
  weight: number;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface Equipment {
  weapons: Weapon[];
  armor: Armor[];
  items: Item[];
  currency: Currency;
}

export interface Experience {
  current: number;
  next: number;
}

export interface CharacterFeature {
  name: string;
  description: string;
}

/**
 * Main D&D 5e Character Data interface
 */
export interface DnD5eCharacterData {
  id: string;
  name: string;
  level: number;
  experience: Experience;
  race: CharacterRace;
  classes: CharacterClass[];
  background: CharacterBackground;
  abilities: {
    strength: AbilityScore;
    dexterity: AbilityScore;
    constitution: AbilityScore;
    intelligence: AbilityScore;
    wisdom: AbilityScore;
    charisma: AbilityScore;
  };
  savingThrows: {
    strength: SavingThrow;
    dexterity: SavingThrow;
    constitution: SavingThrow;
    intelligence: SavingThrow;
    wisdom: SavingThrow;
    charisma: SavingThrow;
  };
  // Simplified skills structure - no double nesting
  skills: Record<string, SkillData>;
  hitPoints: HitPoints;
  armorClass: ArmorClass;
  initiative: Initiative;
  combat: Combat;
  inspiration: boolean;
  deathSaves: DeathSaves;
  hitDice: HitDice;
  spells: Spells;
  equipment: Equipment;
  // Additional character properties
  otherFeatures?: CharacterFeature[];
  notes?: string;
  alliesAndOrganizations?: string;
  additionalFeatures?: string;
}

/**
 * Default skill list for D&D 5e
 */
export const DEFAULT_SKILLS: Record<string, SkillData> = {
  athletics: { ability: 'strength', proficiency: 'none', modifiers: [] },
  acrobatics: { ability: 'dexterity', proficiency: 'none', modifiers: [] },
  'sleight-of-hand': { ability: 'dexterity', proficiency: 'none', modifiers: [] },
  stealth: { ability: 'dexterity', proficiency: 'none', modifiers: [] },
  arcana: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  history: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  investigation: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  nature: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  religion: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  'animal-handling': { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  insight: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  medicine: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  perception: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  survival: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  deception: { ability: 'charisma', proficiency: 'none', modifiers: [] },
  intimidation: { ability: 'charisma', proficiency: 'none', modifiers: [] },
  performance: { ability: 'charisma', proficiency: 'none', modifiers: [] },
  persuasion: { ability: 'charisma', proficiency: 'none', modifiers: [] },
};
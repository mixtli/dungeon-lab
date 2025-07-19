import { z } from 'zod';

export const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
export const abilitySchema = z.enum(ABILITIES);
export type Ability = z.infer<typeof abilitySchema>;

export const SKILLS = [
  'appraise', 'balance', 'bluff', 'climb', 'concentration', 'craft', 'decipher script', 'disable device', 'disguise', 'escape artist', 'forgery', 'gather information', 'hide', 'intimidate', 'knowledge', 'listen', 'move silently', 'open lock', 'perform', 'persuade', 'piloting', 'profession', 'ride', 'search', 'sense motive', 'sleight of hand', 'spellcraft', 'stealth', 'study', 'swim', 'tinker', 'track', 'use magic device'
] as const;
export const skillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof skillSchema>;


export const ARMOR_PROFICIENCIES = [
  'light armor', 'medium armor', 'heavy armor', 'shields'
] as const;
export const armorProficiencySchema = z.enum(ARMOR_PROFICIENCIES);
export type ArmorProficiency = z.infer<typeof armorProficiencySchema>;

export const WEAPON_PROFICIENCIES = [
  'simple weapons', 'martial weapons', 'exotic weapons', 'ranged weapons', 'melee weapons'
] as const;
export const weaponProficiencySchema = z.enum(WEAPON_PROFICIENCIES);
export type WeaponProficiency = z.infer<typeof weaponProficiencySchema>;

export const TOOL_PROFICIENCIES = [
  'artisan tools', 'gaming sets', 'musical instruments', 'other'
] as const;
export const toolProficiencySchema = z.enum(TOOL_PROFICIENCIES);
export type ToolProficiency = z.infer<typeof toolProficiencySchema>;

export const LANGUAGES = [
  'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc', 'abyssal', 'celestial', 'deep speech', 'draconic', 'druidic', 'drow sign language', 'elvish', 'ignan', 'infernal', 'orcs', 'primordial', 'sylvan', 'terran', 'undercommon'
] as const;
export const languageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof languageSchema>;

export const ALIGNMENTS = [
  'lawful good', 'neutral good', 'chaotic good', 'lawful neutral', 'true neutral', 'chaotic neutral', 'lawful evil', 'neutral evil', 'chaotic evil'
] as const;
export const alignmentSchema = z.enum(ALIGNMENTS);
export type Alignment = z.infer<typeof alignmentSchema>;






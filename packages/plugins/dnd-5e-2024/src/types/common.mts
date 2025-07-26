import { z } from 'zod';
import { ReferenceObject } from '@dungeon-lab/shared/types/index.mjs';

export const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
export const abilitySchema = z.enum(ABILITIES);
export type Ability = z.infer<typeof abilitySchema>;

// D&D 5e 2024 Skills (updated official list)
export const SKILLS_2024 = [
  'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight of hand', 'stealth', 'survival'
] as const;
export const skillSchema = z.enum(SKILLS_2024);
export type Skill = z.infer<typeof skillSchema>;

// Legacy skills for backwards compatibility
export const LEGACY_SKILLS = [
  'appraise', 'balance', 'bluff', 'climb', 'concentration', 'craft', 'decipher script', 'disable device', 'disguise', 'escape artist', 'forgery', 'gather information', 'hide', 'intimidate', 'knowledge', 'listen', 'move silently', 'open lock', 'perform', 'persuade', 'piloting', 'profession', 'ride', 'search', 'sense motive', 'sleight of hand', 'spellcraft', 'stealth', 'study', 'swim', 'tinker', 'track', 'use magic device'
] as const;
export const legacySkillSchema = z.enum(LEGACY_SKILLS);
export type LegacySkill = z.infer<typeof legacySkillSchema>;

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

// D&D 5e 2024 Languages (updated list)
export const LANGUAGES_2024 = [
  'common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc', 
  'abyssal', 'celestial', 'deep speech', 'draconic', 'druidic', 'ignan', 'infernal', 
  'primordial', 'sylvan', 'terran', 'undercommon', 'telepathy'
] as const;
export const languageSchema = z.enum(LANGUAGES_2024);
export type Language = z.infer<typeof languageSchema>;

// D&D 5e 2024 Alignments (updated)
export const ALIGNMENTS_2024 = [
  'lawful good', 'neutral good', 'chaotic good', 'lawful neutral', 'neutral', 'chaotic neutral', 'lawful evil', 'neutral evil', 'chaotic evil', 'unaligned'
] as const;
export const alignmentSchema = z.enum(ALIGNMENTS_2024);
export type Alignment = z.infer<typeof alignmentSchema>;

// D&D 5e 2024 Conditions
export const CONDITIONS_2024 = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
  'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone',
  'restrained', 'stunned', 'unconscious'
] as const;
export const conditionSchema = z.enum(CONDITIONS_2024);
export type Condition = z.infer<typeof conditionSchema>;

// D&D 5e 2024 Damage Types
export const DAMAGE_TYPES_2024 = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
] as const;
export const damageTypeSchema = z.enum(DAMAGE_TYPES_2024);
export type DamageType = z.infer<typeof damageTypeSchema>;

// D&D 5e 2024 Spellcasting Schema (improved for integration)
export const spellcastingSchema = z
    .object({
      // Core spellcasting information
      ability: z.enum(['intelligence', 'wisdom', 'charisma']),
      spellSaveDC: z.number(),
      spellAttackBonus: z.number(),
      casterLevel: z.number().optional(), // For NPCs/monsters with class levels
      
      // Spell slots (traditional vancian casting)
      spellSlots: z.array(
        z.object({
          level: z.number().min(1).max(9),
          total: z.number(),
          used: z.number()
        })
      ).optional(),
      
      // Spells known/prepared
      spells: z.array(
        z.object({
          id: z.custom<ReferenceObject>(), // Reference to spell document
          prepared: z.boolean().optional(),
          level: z.number().min(0).max(9).optional(), // Spell level for reference
          uses: z.object({
            value: z.number(),
            per: z.enum(['day', 'short rest', 'long rest', 'recharge'])
          }).optional() // For limited-use spells
        })
      ).optional(),
      
      // 2024 Monster Spellcasting (simplified format)
      innateSpells: z.object({
        atWill: z.array(z.custom<ReferenceObject>()).optional(),
        daily: z.record(z.string(), z.array(z.custom<ReferenceObject>())).optional(), // "1": [...], "2e": [...]
        recharge: z.array(
          z.object({
            recharge: z.string(), // "5-6", "6", etc.
            spell: z.custom<ReferenceObject>()
          })
        ).optional()
      }).optional(),
      
      // Display options for 2024
      displayAs: z.enum(['trait', 'action', 'bonus action', 'reaction']).optional(),
      description: z.string().optional() // For custom spellcasting descriptions
    })
    .optional();

export type Spellcasting = z.infer<typeof spellcastingSchema>;






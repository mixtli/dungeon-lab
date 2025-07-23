import { z } from 'zod';

/**
 * Individual skill schema
 */
export const skillSchema = z.record(z.unknown()); // Foundry uses complex nested objects

/**
 * All 18 D&D 5e skills with their abbreviations
 */
export const skillsSchema = z.object({
  acr: skillSchema, // Acrobatics (Dex)
  ani: skillSchema, // Animal Handling (Wis)
  arc: skillSchema, // Arcana (Int)
  ath: skillSchema, // Athletics (Str)
  dec: skillSchema, // Deception (Cha)
  his: skillSchema, // History (Int)
  ins: skillSchema, // Insight (Wis)
  itm: skillSchema, // Intimidation (Cha)
  inv: skillSchema, // Investigation (Int)
  med: skillSchema, // Medicine (Wis)
  nat: skillSchema, // Nature (Int)
  prc: skillSchema, // Perception (Wis)
  prf: skillSchema, // Performance (Cha)
  per: skillSchema, // Persuasion (Cha)
  rel: skillSchema, // Religion (Int)
  slt: skillSchema, // Sleight of Hand (Dex)
  ste: skillSchema, // Stealth (Dex)
  sur: skillSchema  // Survival (Wis)
});

/**
 * Skill names for reference
 */
export const skillNames = {
  acr: 'Acrobatics',
  ani: 'Animal Handling',
  arc: 'Arcana',
  ath: 'Athletics',
  dec: 'Deception',
  his: 'History',
  ins: 'Insight',
  itm: 'Intimidation',
  inv: 'Investigation',
  med: 'Medicine',
  nat: 'Nature',
  prc: 'Perception',
  prf: 'Performance',
  per: 'Persuasion',
  rel: 'Religion',
  slt: 'Sleight of Hand',
  ste: 'Stealth',
  sur: 'Survival'
} as const;

export type Skills = z.infer<typeof skillsSchema>;
export type SkillKey = keyof typeof skillNames;
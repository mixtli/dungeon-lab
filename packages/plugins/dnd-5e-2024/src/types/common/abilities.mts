import { z } from 'zod';

/**
 * Individual ability score schema (STR, DEX, CON, INT, WIS, CHA)
 */
export const abilityScoreSchema = z.object({
  value: z.number().min(1).max(30),
  proficient: z.number().min(0).max(2), // 0=none, 1=proficient, 2=expertise
  max: z.number().nullable(),
  bonuses: z.object({
    check: z.string().default(''),
    save: z.string().default('')
  })
});

/**
 * Complete abilities object with all 6 D&D ability scores
 */
export const abilitiesSchema = z.object({
  str: abilityScoreSchema,
  dex: abilityScoreSchema,
  con: abilityScoreSchema,
  int: abilityScoreSchema,
  wis: abilityScoreSchema,
  cha: abilityScoreSchema
});

export type AbilityScore = z.infer<typeof abilityScoreSchema>;
export type Abilities = z.infer<typeof abilitiesSchema>;
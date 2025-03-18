import { z } from 'zod';

/**
 * Schema for validating the character creation form data
 * This is specific to the form structure and will be translated
 * to the full character schema before storage
 */

// Schema for ability scores
const abilityScoreSchema = z.number()
  .int()
  .min(3)
  .max(20)
  .default(10);

// Schema for hit points
const hitPointsSchema = z.object({
  maximum: z.number().int().min(1).default(10)
});

// Schema for character creation form data
export const characterCreationFormSchema = z.object({
  race: z.string().min(1),
  class: z.string().min(1),
  level: z.number().int().min(1).max(20).default(1),
  alignment: z.string().min(1),
  background: z.string().min(1),
  abilities: z.object({
    strength: abilityScoreSchema,
    dexterity: abilityScoreSchema,
    constitution: abilityScoreSchema,
    intelligence: abilityScoreSchema,
    wisdom: abilityScoreSchema,
    charisma: abilityScoreSchema
  }),
  hitPoints: hitPointsSchema
});

// Export the type for use in components
export type CharacterCreationFormData = z.infer<typeof characterCreationFormSchema>; 
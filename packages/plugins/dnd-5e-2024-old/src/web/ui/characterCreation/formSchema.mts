import { z } from 'zod';

// Schema for purchased equipment item in the shop
const purchasedItemSchema = z.object({
  name: z.string(),
  cost: z.number(),
  quantity: z.number().default(1)
});
// Form data schema - matches the structure of form data after unflatten() is called

export const characterCreationFormSchema = z.object({
  // Class Selection
  name: z.string(),
  class: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    selectedSkills: z.array(z.string()),
    selectedEquipment: z.enum(['A', 'B'])
  }),

  // Origin Selection
  origin: z.object({
    species: z.object({
      id: z.string(),
      name: z.string()
    }),
    background: z.object({
      id: z.string(),
      name: z.string(),
      selectedEquipment: z.string()
    }),
    selectedLanguages: z.array(z.string())
  }),

  // Ability Scores
  abilities: z.object({
    method: z.enum(['standard', 'pointbuy', 'roll']),
    pointsRemaining: z.number().int().min(0).max(27).default(27),
    availableScores: z.array(z.number().int()).default([]),
    strength: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 3 && Number(val) <= 18, {
        message: 'Must be a number between 3 and 18'
      }),
    dexterity: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 3 && Number(val) <= 18, {
        message: 'Must be a number between 3 and 18'
      }),
    constitution: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 3 && Number(val) <= 18, {
        message: 'Must be a number between 3 and 18'
      }),
    intelligence: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 3 && Number(val) <= 18, {
        message: 'Must be a number between 3 and 18'
      }),
    wisdom: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 3 && Number(val) <= 18, {
        message: 'Must be a number between 3 and 18'
      }),
    charisma: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 3 && Number(val) <= 18, {
        message: 'Must be a number between 3 and 18'
      })
  }),

  // Equipment
  equipment: z
    .object({
      remainingGold: z.number().min(0).default(0),
      purchasedItems: z.array(purchasedItemSchema).optional()
    })
    .optional(),

  // Character Details
  details: z.object({
    alignment: z.enum([
      'lawful-good',
      'neutral-good',
      'chaotic-good',
      'lawful-neutral',
      'true-neutral',
      'chaotic-neutral',
      'lawful-evil',
      'neutral-evil',
      'chaotic-evil'
    ]),
    age: z.string().transform((val) => parseInt(val, 10)), // .pipe(z.number().int().positive().optional()),
    height: z.string().optional(),
    weight: z.string().optional(),
    eyes: z.string().optional(),
    hair: z.string().optional(),
    skin: z.string().optional(),
    personalityTraits: z.string().optional(),
    ideals: z.string().optional(),
    bonds: z.string().optional(),
    flaws: z.string().optional(),
    backstory: z.string().optional(),
    allies: z.string().optional(),
    additionalFeatures: z.string().optional()
  })
});

export type CharacterCreationFormData = z.infer<typeof characterCreationFormSchema>;
export const partialCharacterCreationFormSchema = characterCreationFormSchema.deepPartial();

// Export types
export type PartialCharacterCreationFormData = z.infer<typeof partialCharacterCreationFormSchema>;
export type PurchasedItem = z.infer<typeof purchasedItemSchema>;

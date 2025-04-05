import { z } from 'zod';

/**
 * Schema for validating character creation form data
 * This only contains fields that are directly used in the form
 * and doesn't duplicate document schemas from the shared types
 */

export function deepPartial<T extends z.ZodTypeAny>(schema: T): z.ZodType<any> {
  if (schema instanceof z.ZodObject) {
    const newShape = Object.fromEntries(
      Object.entries(schema.shape).map(([key, value]) => [
        key,
        deepPartial(value as z.ZodTypeAny).optional()
      ])
    );
    return z.object(newShape);
  } else if (schema instanceof z.ZodArray) {
    return z.array(deepPartial(schema.element as z.ZodTypeAny)).optional() as any;
  } else if (schema instanceof z.ZodEnum) {
    return schema.optional();
  } else if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    return schema.optional();
  } else if (schema instanceof z.ZodDefault) {
    return deepPartial(schema._def.innerType as z.ZodTypeAny);
  }
  return schema.optional();
}

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
    selectedSkills: z.array(z.string()).optional(),
    selectedEquipment: z.enum(['A', 'B']).optional()
  }),
  
  // Origin Selection
  origin: z.object({
    species: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
    }),
    background: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      selectedEquipment: z.string().optional(),
    }).default({}),
    selectedLanguages: z.array(z.string()).optional()
  }),
  
  // Ability Scores
  abilities: z.object({
    method: z.enum(['standard', 'pointbuy', 'roll']),
    pointsRemaining: z.number().int().min(0).max(27).default(27),
    availableScores: z.array(z.number().int()).default([]),
    strength: z.number().int().min(3).max(18).optional(),
    dexterity: z.number().int().min(3).max(18).optional(),
    constitution: z.number().int().min(3).max(18).optional(),
    intelligence: z.number().int().min(3).max(18).optional(),
    wisdom: z.number().int().min(3).max(18).optional(),
    charisma: z.number().int().min(3).max(18).optional()
  }),
  
  // Equipment
  equipment: z.object({
    remainingGold: z.number().min(0).default(0),
    purchasedItems: z.array(purchasedItemSchema).optional()
  }).optional(),
  
  // Character Details
  details: z.object({
    alignment: z.enum([
      'lawful-good', 'neutral-good', 'chaotic-good', 
      'lawful-neutral', 'true-neutral', 'chaotic-neutral',
      'lawful-evil', 'neutral-evil', 'chaotic-evil'
    ]).optional(),
    age: z.number().int().positive().optional(),
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

export const partialCharacterCreationFormSchema = deepPartial(characterCreationFormSchema);

// Export types
export type CharacterCreationFormData = z.infer<typeof characterCreationFormSchema>;
export type PartialCharacterCreationFormData = z.infer<typeof partialCharacterCreationFormSchema>;
export type PurchasedItem = z.infer<typeof purchasedItemSchema>;
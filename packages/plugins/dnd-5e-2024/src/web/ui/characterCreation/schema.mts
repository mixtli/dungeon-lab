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

// Schema for class features
const classFeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  level: z.number()
});

// Schema for species traits
const speciesTraitSchema = z.object({
  name: z.string(),
  description: z.string()
});

// Schema for background feat
const featSchema = z.object({
  name: z.string(),
  description: z.string()
});

// Schema for equipment
const equipmentSchema = z.object({
  items: z.array(z.any()),
  gold: z.number().optional()
});

// Schema for purchased equipment item
const purchasedItemSchema = z.object({
  name: z.string(),
  cost: z.number(),
  quantity: z.number().default(1)
});

// Schema for character details
const characterDetailsSchema = z.object({
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
});

// Schema for character equipment
const characterEquipmentSchema = z.object({
  purchasedItems: z.array(purchasedItemSchema).optional(),
  remainingGold: z.number().min(0).default(0)
});

// Schema for class document from server
export const classDocumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  hitDie: z.enum(['d6', 'd8', 'd10', 'd12']),
  primaryAbility: z.array(z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])),
  savingThrowProficiencies: z.array(z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])),
  armorProficiencies: z.array(z.string()),
  weaponProficiencies: z.array(z.string()),
  toolProficiencies: z.array(z.string()),
  skillChoices: z.number(),
  skillOptions: z.array(z.string()),
  equipmentChoices: z.array(z.object({
    optionA: z.array(z.any()),
    optionB: z.array(z.any())
  })).optional(),
  features: z.array(classFeatureSchema)
});

// Schema for species document
export const speciesDocumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  abilityScoreIncrease: z.string(),
  size: z.string(),
  speed: z.number(),
  traits: z.array(speciesTraitSchema)
});

// Schema for background document
export const backgroundDocumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  abilityBoosts: z.array(z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])),
  skillProficiencies: z.array(z.string()).optional(),
  skillChoices: z.array(z.string()).optional(),
  skillChoiceCount: z.number().optional(),
  toolProficiencies: z.array(z.string()).optional(),
  toolChoices: z.array(z.string()).optional(),
  toolChoiceCount: z.number().optional(),
  equipment: equipmentSchema.optional(),
  feat: featSchema.optional()
});

// Schema for character creation form data
export const characterCreationFormSchema = z.object({
  // Step 1: Basic Info (handled by main app)
  // name, avatar, token, description
  
  // Step 2: Class Selection
  class: z.object({
    name: z.string().min(1),
    document: classDocumentSchema,
    selectedSkills: z.array(z.string()).optional(),
    selectedEquipment: z.enum(['A', 'B']).optional()
  }),
  
  // Step 3: Origin Selection
  origin: z.object({
    species: z.string().min(1).optional(),
    speciesDocument: speciesDocumentSchema.optional(),
    background: z.string().min(1).optional(),
    backgroundDocument: backgroundDocumentSchema.optional(),
    selectedAbilityBoosts: z.array(z.string()).optional(),
    bonusPlusTwo: z.string().optional(),
    bonusPlusOne: z.string().optional(),
    selectedSkills: z.array(z.string()).optional(),
    selectedTools: z.array(z.string()).optional(),
    selectedEquipment: z.enum(['equipment', 'gold']).optional(),
    selectedLanguages: z.array(z.string()).optional()
  }).optional(),
  
  // Step 4: Ability Scores
  abilities: z.object({
    method: z.enum(['standard', 'pointbuy', 'roll']).default('standard'),
    standard: z.object({
      strength: z.string().optional(),
      dexterity: z.string().optional(),
      constitution: z.string().optional(),
      intelligence: z.string().optional(),
      wisdom: z.string().optional(),
      charisma: z.string().optional()
    }).optional(),
    pointbuy: z.object({
      strength: z.number().int().min(8).max(15).default(8),
      dexterity: z.number().int().min(8).max(15).default(8),
      constitution: z.number().int().min(8).max(15).default(8),
      intelligence: z.number().int().min(8).max(15).default(8),
      wisdom: z.number().int().min(8).max(15).default(8),
      charisma: z.number().int().min(8).max(15).default(8)
    }).optional(),
    roll: z.object({
      strength: z.number().int().min(3).max(18).optional(),
      dexterity: z.number().int().min(3).max(18).optional(),
      constitution: z.number().int().min(3).max(18).optional(),
      intelligence: z.number().int().min(3).max(18).optional(),
      wisdom: z.number().int().min(3).max(18).optional(),
      charisma: z.number().int().min(3).max(18).optional()
    }).optional(),
    pointsRemaining: z.number().int().min(0).max(27).default(27)
  }).optional(),
  
  // Step 5: Equipment
  equipment: characterEquipmentSchema.optional(),
  
  // Step 6: Details
  details: characterDetailsSchema.optional(),
  
  hitPoints: z.object({
    maximum: z.number().int().min(1).optional()
  }).optional()
});

// Export types
export type ClassDocument = z.infer<typeof classDocumentSchema>;
export type SpeciesDocument = z.infer<typeof speciesDocumentSchema>;
export type BackgroundDocument = z.infer<typeof backgroundDocumentSchema>;
export type CharacterCreationFormData = z.infer<typeof characterCreationFormSchema>;
export type CharacterEquipment = z.infer<typeof characterEquipmentSchema>;
export type CharacterDetails = z.infer<typeof characterDetailsSchema>;
export type PurchasedItem = z.infer<typeof purchasedItemSchema>; 
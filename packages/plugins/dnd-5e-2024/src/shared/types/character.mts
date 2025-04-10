import { z } from 'zod';
import { IActor } from '@dungeon-lab/shared/index.mjs';

const abilitySchema = z.object({
      score: z.number().min(1).max(30),
      modifier: z.number().min(-5).max(10),
      savingThrow: z.object({
        proficient: z.boolean().default(false),
        bonus: z.number().default(0)
      })
    })

// Full character schema for the complete character heet
export const characterDataSchema = z.object({
  // Basic info
  name: z.string().min(1),
  species: z.string().min(1),
  classes: z.array(z.object({
    name: z.string(),
    level: z.number().min(1).max(20),
    subclass: z.string().optional(),
    hitDiceType: z.enum(['d6', 'd8', 'd10', 'd12'])
  })),
  background: z.string(),
  alignment: z.enum([
    'lawful good', 'neutral good', 'chaotic good',
    'lawful neutral', 'true neutral', 'chaotic neutral',
    'lawful evil', 'neutral evil', 'chaotic evil'
  ]),

  // Core stats
  experiencePoints: z.number().min(0).default(0),
  proficiencyBonus: z.number().default(2),
  armorClass: z.number().default(10),
  initiative: z.number().default(0),
  speed: z.number().default(30),
  hitPoints: z.object({
    maximum: z.number(),
    current: z.number(),
    temporary: z.number().optional()
  }),
  hitDice: z.object({
    total: z.number(),
    current: z.number(),
    type: z.enum(['d6', 'd8', 'd10', 'd12'])
  }),

  // Abilities
  abilities: z.object({
    strength: abilitySchema,
    dexterity: abilitySchema,
    constitution: abilitySchema,
    intelligence: abilitySchema,
    wisdom: abilitySchema,
    charisma: abilitySchema
  }),

  // Equipment and inventory
  equipment: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(0)
  })).default([]),

  // Features and traits
  features: z.array(z.object({
    name: z.string(),
    source: z.string(),
    description: z.string()
  })).default([]),

  // Spellcasting
  spellcasting: z.object({
    ability: z.enum(['intelligence', 'wisdom', 'charisma']),
    spellSaveDC: z.number(),
    spellAttackBonus: z.number(),
    spellSlots: z.array(z.object({
      level: z.number().min(1).max(9),
      total: z.number(),
      used: z.number()
    })),
    spells: z.array(z.object({
      id: z.string(),
      prepared: z.boolean().optional()
    }))
  }).optional(),

  // Biography
  biography: z.object({
    appearance: z.string().optional(),
    backstory: z.string().optional(),
    personalityTraits: z.string().optional(),
    ideals: z.string().optional(),
    bonds: z.string().optional(),
    flaws: z.string().optional()
  }).default({})
});

export type ICharacterData = z.infer<typeof characterDataSchema>;

export type ICharacter = IActor & { data: ICharacterData };

// Convert schema to JSON Schema for plugin registration
export const characterJsonSchema = characterDataSchema.describe('D&D 5E Character'); 
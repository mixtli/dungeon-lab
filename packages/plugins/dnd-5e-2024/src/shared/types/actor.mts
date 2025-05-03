import { z } from 'zod';
import { characterDataSchema } from './character.mjs';

// Monster schema
export const monsterSchema = z.object({
  name: z.string(),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
  type: z.string(),
  alignment: z.string(),
  armorClass: z.object({
    value: z.number(),
    type: z.string().optional()
  }),
  hitPoints: z.object({
    value: z.number(),
    formula: z.string().optional(),
    current: z.number().optional()
  }),
  speed: z.object({
    walk: z.number().optional(),
    fly: z.number().optional(),
    swim: z.number().optional(),
    climb: z.number().optional(),
    burrow: z.number().optional()
  }),
  abilities: z.object({
    strength: z.number().min(1).max(30),
    dexterity: z.number().min(1).max(30),
    constitution: z.number().min(1).max(30),
    intelligence: z.number().min(1).max(30),
    wisdom: z.number().min(1).max(30),
    charisma: z.number().min(1).max(30)
  }),
  savingThrows: z
    .object({
      strength: z.number().optional(),
      dexterity: z.number().optional(),
      constitution: z.number().optional(),
      intelligence: z.number().optional(),
      wisdom: z.number().optional(),
      charisma: z.number().optional()
    })
    .optional(),
  skills: z.record(z.string(), z.number()).optional(),
  senses: z
    .object({
      darkvision: z.number().optional(),
      blindsight: z.number().optional(),
      tremorsense: z.number().optional(),
      truesight: z.number().optional()
    })
    .optional(),
  languages: z.array(z.string()).optional(),
  challengeRating: z.number(),
  xp: z.number().optional(),
  traits: z
    .array(
      z.object({
        name: z.string(),
        description: z.string()
      })
    )
    .optional(),
  actions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        attackBonus: z.number().optional(),
        damage: z.string().optional(),
        damageType: z.string().optional()
      })
    )
    .optional(),
  reactions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string()
      })
    )
    .optional(),
  legendaryActions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string()
      })
    )
    .optional()
});

// NPC schema - simplified character for non-player characters
export const npcSchema = z.object({
  name: z.string(),
  species: z.string(),
  occupation: z.string(),
  alignment: z.string(),
  armorClass: z.number(),
  hitPoints: z.object({
    maximum: z.number(),
    current: z.number().optional()
  }),
  speed: z.number(),
  abilities: z.object({
    strength: z.number().min(1).max(30),
    dexterity: z.number().min(1).max(30),
    constitution: z.number().min(1).max(30),
    intelligence: z.number().min(1).max(30),
    wisdom: z.number().min(1).max(30),
    charisma: z.number().min(1).max(30)
  }),
  skills: z.record(z.string(), z.number()).optional(),
  equipment: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().min(0)
      })
    )
    .optional(),
  features: z
    .array(
      z.object({
        name: z.string(),
        description: z.string()
      })
    )
    .optional(),
  biography: z.string().optional()
});

export type IMonster = z.infer<typeof monsterSchema>;
export type INPC = z.infer<typeof npcSchema>;

// Create the discriminated union for ActorData
export const actorDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('character'), data: characterDataSchema }),
  z.object({ type: z.literal('monster'), data: monsterSchema }),
  z.object({ type: z.literal('npc'), data: npcSchema })
]);

export type IActorData = z.infer<typeof actorDataSchema>;

// Export const for each actor type for validation functions
export const actorTypes = {
  character: characterDataSchema,
  monster: monsterSchema,
  npc: npcSchema
};

// Convert schemas to JSON Schema for plugin registration
export const monsterJsonSchema = monsterSchema.describe('D&D 5E Monster');
export const npcJsonSchema = npcSchema.describe('D&D 5E NPC');

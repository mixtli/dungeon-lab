import { z } from 'zod';

// Character data schema
export const dndCharacterDataSchema = z.object({
  species: z.string(),
  classes: z.array(z.object({
    name: z.string(),
    level: z.number(),
    subclass: z.string().optional()
  })),
  alignment: z.string(),
  speed: z.object({
    walk: z.number(),
    fly: z.number().optional(),
    swim: z.number().optional(),
    climb: z.number().optional()
  }),
  hitPoints: z.object({
    current: z.number(),
    maximum: z.number(),
    temporary: z.number().optional()
  }),
  abilityScores: z.object({
    strength: z.number(),
    dexterity: z.number(),
    constitution: z.number(),
    intelligence: z.number(),
    wisdom: z.number(),
    charisma: z.number()
  }),
  skills: z.record(z.object({
    proficient: z.boolean(),
    expertise: z.boolean().optional(),
    bonus: z.number()
  })),
  armorClass: z.object({
    base: z.number(),
    bonus: z.number().optional()
  }),
  savingThrows: z.record(z.object({
    proficient: z.boolean(),
    bonus: z.number()
  })),
  languages: z.array(z.string()),
  background: z.object({
    name: z.string(),
    trait: z.string(),
    ideal: z.string(),
    bond: z.string(),
    flaw: z.string()
  }),
  details: z.object({
    age: z.number().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    eyes: z.string().optional(),
    skin: z.string().optional(),
    hair: z.string().optional()
  })
});

// Weapon data schema
export const dndWeaponDataSchema = z.object({
  damage: z.object({
    diceCount: z.number(),
    diceType: z.number(),
    type: z.string(),
    bonus: z.number().optional()
  }),
  properties: z.array(z.string()),
  throwRange: z.object({
    normal: z.number(),
    maximum: z.number()
  }).optional()
});

// Spell data schema
export const dndSpellDataSchema = z.object({
  level: z.number(),
  castingTime: z.string(),
  rangeArea: z.string(),
  attackSave: z.string().optional(),
  duration: z.string(),
  damageEffect: z.string(),
  components: z.array(z.string()),
  school: z.string()
});

// Infer TypeScript types from Zod schemas
export type DndCharacterData = z.infer<typeof dndCharacterDataSchema>;
export type DndWeaponData = z.infer<typeof dndWeaponDataSchema>;
export type DndSpellData = z.infer<typeof dndSpellDataSchema>; 
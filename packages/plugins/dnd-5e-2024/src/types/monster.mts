import { z } from 'zod';
import { statBlockSchema } from './stat-block.mjs';

// Monster-specific fields that extend the base stat block
export const monsterSpecificSchema = z.object({
  // Monster behavior and ecology
  behavior: z.object({
    tactics: z.string().optional(),
    ecology: z.string().optional(),
    lairActions: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        initiative: z.number().optional()
      })
    ).optional(),
    regionalEffects: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        range: z.string().optional()
      })
    ).optional()
  }).optional(),
  
  // Monster-specific legendary abilities
  mythicActions: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      cost: z.number().optional()
    })
  ).optional(),
  
  // Additional monster metadata
  monsterType: z.enum(['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead']).optional(),
  tags: z.array(z.string()).optional(), // For subtypes like "shapechanger", "titan"
  environment: z.array(z.string()).optional() // Deprecated in favor of habitat, kept for compatibility
});

// Complete monster schema that combines stat block with monster-specific data
export const monsterSchema = statBlockSchema.merge(monsterSpecificSchema);

export type IMonster = z.infer<typeof monsterSchema>;

// Create/Update schemas for monsters
export const createMonsterSchema = monsterSchema.partial({
  proficiencyBonus: true,
  experiencePoints: true,
  senses: true
});

export const updateMonsterSchema = monsterSchema.partial();

export type IMonsterCreateData = z.infer<typeof createMonsterSchema>;
export type IMonsterUpdateData = z.infer<typeof updateMonsterSchema>;
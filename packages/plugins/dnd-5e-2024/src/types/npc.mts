import { z } from 'zod';
import { statBlockSchema } from './stat-block.mjs';
import { ReferenceObject } from '@dungeon-lab/shared/types/index.mjs';

// NPC-specific fields that extend the base stat block
export const npcSpecificSchema = z.object({
  // NPC identity and background
  identity: z.object({
    species: z.string().optional(), // "Human", "Elf", etc.
    occupation: z.string().optional(), // "Merchant", "Guard Captain", etc.
    background: z.string().optional(), // "Noble", "Criminal", etc.
    faction: z.string().optional(), // Organization or group affiliation
    biography: z.string().optional(),
    personality: z.object({
      traits: z.array(z.string()).optional(),
      ideals: z.array(z.string()).optional(),
      bonds: z.array(z.string()).optional(),
      flaws: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  
  // NPC social information
  social: z.object({
    attitude: z.enum(['hostile', 'unfriendly', 'neutral', 'friendly', 'helpful']).optional(),
    relationships: z.array(
      z.object({
        name: z.string(),
        relationship: z.string(), // "ally", "enemy", "family", etc.
        description: z.string().optional()
      })
    ).optional(),
    reputation: z.object({
      value: z.number().min(-10).max(10).optional(), // -10 to +10 scale
      description: z.string().optional()
    }).optional()
  }).optional(),
  
  // NPC class information (for NPCs with PC classes)
  classes: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(1).max(20),
      subclass: z.string().optional()
    })
  ).optional(),
  
  // NPC-specific features and abilities
  roleplayingNotes: z.string().optional(),
  questHooks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      reward: z.string().optional()
    })
  ).optional(),
  
  // Shop inventory (for merchant NPCs)
  inventory: z.array(
    z.object({
      item: z.custom<ReferenceObject>(),
      quantity: z.number().min(0),
      price: z.object({
        value: z.number(),
        currency: z.enum(['cp', 'sp', 'ep', 'gp', 'pp'])
      }).optional(),
      availability: z.enum(['always', 'limited', 'special']).optional()
    })
  ).optional()
});

// Complete NPC schema that combines stat block with NPC-specific data
export const npcSchema = statBlockSchema.merge(npcSpecificSchema);

export type INPC = z.infer<typeof npcSchema>;

// Create/Update schemas for NPCs
export const createNPCSchema = npcSchema.partial({
  proficiencyBonus: true,
  experiencePoints: true,
  senses: true
});

export const updateNPCSchema = npcSchema.partial();

export type INPCCreateData = z.infer<typeof createNPCSchema>;
export type INPCUpdateData = z.infer<typeof updateNPCSchema>;


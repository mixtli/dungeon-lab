import { z } from 'zod';
import { dndStatBlockSchema } from './stat-block.mjs';

/**
 * D&D 5e NPC Runtime Types
 * 
 * NPC schema that extends the stat block with NPC-specific information.
 * All document references use MongoDB 'id' fields.
 */

// NPC-specific fields that extend the base stat block
export const dndNpcSpecificSchema = z.object({
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
    relationships: z.array(z.object({
      name: z.string(),
      relationship: z.string(), // "ally", "enemy", "family", etc.
      description: z.string().optional()
    })).optional(),
    reputation: z.object({
      value: z.number().min(-10).max(10).optional(), // -10 to +10 scale
      description: z.string().optional()
    }).optional()
  }).optional(),
  
  // NPC class information (for NPCs with PC classes)
  classes: z.array(z.object({
    name: z.string(),
    level: z.number().min(1).max(20),
    subclass: z.string().optional()
  })).optional(),
  
  // NPC-specific features and abilities
  roleplayingNotes: z.string().optional(),
  questHooks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    reward: z.string().optional()
  })).optional(),
  
  // Shop inventory (for merchant NPCs)
  inventory: z.array(z.object({
    item: z.any(), // Reference to item document
    quantity: z.number().min(0),
    price: z.object({
      value: z.number(),
      currency: z.enum(['cp', 'sp', 'ep', 'gp', 'pp'])
    }).optional(),
    availability: z.enum(['always', 'limited', 'special']).optional()
  })).optional()
});

// Complete NPC data schema that combines stat block with NPC-specific data
export const dndNpcDataSchema = dndStatBlockSchema.merge(dndNpcSpecificSchema);

/**
 * D&D NPC document schema (runtime)
 */
// Note: NPC documents should use the standard actorSchema from shared
// This is just the plugin data schema
export const dndNpcDocumentSchema = dndNpcDataSchema;

// Create/Update schemas for NPCs
export const createDndNpcSchema = dndNpcDataSchema.partial({
  proficiencyBonus: true,
  experiencePoints: true,
  senses: true
});

export const updateDndNpcSchema = dndNpcDataSchema.partial();

/**
 * Runtime type exports
 */
export type DndNpcData = z.infer<typeof dndNpcDataSchema>;
export type DndNpcDocument = z.infer<typeof dndNpcDocumentSchema>;
export type CreateDndNpc = z.infer<typeof createDndNpcSchema>;
export type UpdateDndNpc = z.infer<typeof updateDndNpcSchema>;
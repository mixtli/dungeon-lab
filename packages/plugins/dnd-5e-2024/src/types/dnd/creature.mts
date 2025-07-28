import { z } from 'zod';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { dndStatBlockSchema } from './stat-block.mjs';

/**
 * D&D 5e Creature Runtime Types
 * 
 * Creature schema that extends the stat block with creature-specific information.
 * Covers both monsters and NPCs - they use identical stat blocks in 2024 D&D.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Creature-specific fields that extend the base stat block
 * Supports both monsters and NPCs with contextual metadata
 */
export const dndCreatureSpecificSchema = z.object({
  // Environment and ecology (for monsters and NPCs)
  environment: z.array(z.string()).optional(),
  
  // Tags for organization and filtering (e.g., "npc", "merchant", "dragon", "undead")
  tags: z.array(z.string()).optional(),
  
  // General description
  description: z.string().optional(),
  
  // NPC identity and background (optional, used when creature is an NPC)
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

/**
 * D&D Creature runtime data schema
 * This extends the stat block with creature-specific fields
 * Used for both monsters and NPCs (they're mechanically identical in 2024)
 */
export const dndCreatureDataSchema = dndStatBlockSchema.merge(dndCreatureSpecificSchema);

/**
 * D&D Creature document schema (runtime)
 * Extends base Actor document with creature-specific plugin data
 */
export const dndCreatureDocumentSchema = actorSchema.extend({
  pluginData: dndCreatureDataSchema
});

/**
 * Runtime type exports
 */
export type DndCreatureData = z.infer<typeof dndCreatureDataSchema>;
export type DndCreatureDocument = z.infer<typeof dndCreatureDocumentSchema>;

/**
 * Creature size identifiers (used by both monsters and NPCs)
 */
export const creatureSizeIdentifiers = [
  'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'
] as const;

export type CreatureSizeIdentifier = typeof creatureSizeIdentifiers[number];

// Create/Update schemas for creatures
export const createDndCreatureSchema = dndCreatureDataSchema.partial({
  proficiencyBonus: true,
  experiencePoints: true,
  senses: true
});

export const updateDndCreatureSchema = dndCreatureDataSchema.partial();

export type CreateDndCreature = z.infer<typeof createDndCreatureSchema>;
export type UpdateDndCreature = z.infer<typeof updateDndCreatureSchema>;
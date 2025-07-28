import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { creatureSizeSchema, restTypeSchema } from './common.mjs';

/**
 * D&D 5e Species Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */

/**
 * Species trait with name and description
 * Every species ability is now a named trait
 */
export const speciesTraitSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Some traits have mechanical effects at higher levels */
  levelRequirement: z.number().optional(),
  /** Usage limitations for active traits */
  uses: z.object({
    value: z.number(),
    per: restTypeSchema
  }).optional()
});

/**
 * Ancestry system for species like Dragonborn
 * Allows for mechanical variations within a species
 */
export const ancestrySchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Affects specific traits like breath weapon */
  affectedTraits: z.array(z.string()),
  /** Additional traits granted by this ancestry */
  bonusTraits: z.array(speciesTraitSchema).optional()
});

/**
 * Complete D&D 2024 Species Schema
 */
export const dndSpeciesDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  
  /** 2024: Always includes creature type (e.g., "Humanoid") */
  creatureType: z.string(),
  
  /** 2024: Size with descriptive text like "Medium (about 5–7 feet tall)" */
  size: z.object({
    category: creatureSizeSchema,
    description: z.string() // e.g., "about 5–7 feet tall"
  }),
  
  /** 2024: Movement speeds matching monster stat block format */
  movement: z.object({
    walk: z.number().default(30),
    fly: z.number().optional(),
    swim: z.number().optional(), 
    climb: z.number().optional(),
    burrow: z.number().optional(),
    /** Special movement notes like "(hover)" for fly speed */
    hover: z.boolean().optional(),
    notes: z.string().optional()
  }),
  
  /** All species abilities as named traits */
  traits: z.array(speciesTraitSchema),
  
  /** For species with ancestry options (Dragonborn, etc.) */
  ancestryOptions: z.array(ancestrySchema).optional(),
  
  /** 2024: Life span information */
  lifespan: z.object({
    maturity: z.number(), // Age of physical maturity
    average: z.number(),  // Average lifespan
    maximum: z.number().optional() // Maximum known lifespan
  }).optional(),
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Species document schema (runtime)
 * Extends base VTT document with species-specific plugin data
 */
export const dndSpeciesDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('species'),
  pluginData: dndSpeciesDataSchema
});

/**
 * Runtime type exports
 */
export type DndSpeciesData = z.infer<typeof dndSpeciesDataSchema>;
export type DndSpeciesDocument = z.infer<typeof dndSpeciesDocumentSchema>;
export type DndSpeciesTrait = z.infer<typeof speciesTraitSchema>;
export type DndAncestry = z.infer<typeof ancestrySchema>;

/**
 * D&D 2024 Species (10 in core PHB)
 * NOTE: Half-Elf and Half-Orc removed, replaced with mix-and-match rules
 */
export const speciesIdentifiers = [
  'aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath',
  'halfling', 'human', 'orc', 'tiefling'
] as const;

export type SpeciesIdentifier = typeof speciesIdentifiers[number];
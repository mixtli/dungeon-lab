import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { 
  abilitySchema, 
  currencyTypeSchema, 
  genericChoiceSchema,
  itemReferenceObjectSchema,
  featReferenceObjectSchema
} from './common.mjs';

/**
 * D&D 5e Background Runtime Types
 * 
 * These are the canonical runtime types used in MongoDB documents.
 * All document references use MongoDB 'id' fields.
 * Compendium types are auto-derived from these with id→_ref conversion.
 */


/**
 * Equipment choice structure matching 2024 "Choose A or B" pattern
 * Every background offers choice between specific equipment or 50 GP
 */
export const backgroundEquipmentSchema = z.object({
  /** Option A: Specific equipment list */
  equipmentPackage: z.object({
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number().default(1),
      /** Reference to item document */
      item: itemReferenceObjectSchema.optional()
    })),
    /** Starting gold pieces included in package */
    goldPieces: z.number()
  }),
  /** Option B: Always exactly 50 GP in 2024 */
  goldAlternative: z.number().default(50),
  /** Currency type (always gold for backgrounds) */
  currency: currencyTypeSchema.default('gp')
});

/**
 * Tool proficiency schema with document references
 */
export const toolProficiencySchema = z.object({
  tool: itemReferenceObjectSchema,
  displayName: z.string()
});

/**
 * Complete D&D 2024 Background Schema
 * Matches SRD structure exactly
 */
export const dndBackgroundDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  
  /** 2024: Ability scores moved from species to backgrounds - exactly 3 ability scores to choose from */
  abilityScores: z.array(abilitySchema).length(3),
  
  /** 2024: Each background grants exactly one Origin Feat */
  originFeat: z.object({
    name: z.string(),
    /** Reference to feat document */
    feat: featReferenceObjectSchema.optional()
  }),
  
  /** 2024: Each background grants exactly 2 skill proficiencies */
  skillProficiencies: z.array(z.string()).length(2),
  
  /** 
   * 2024: Tool proficiencies - can be fixed list OR player choice
   * Fixed example: Thieves' Tools for Criminal
   * Choice example: "Choose one kind of Gaming Set" for Soldier
   */
  toolProficiencies: z.union([
    z.array(toolProficiencySchema), // Fixed proficiencies
    genericChoiceSchema // Choice between options
  ]).optional(),
  
  /** 2024: Equipment following "Choose A or B" pattern */
  equipment: backgroundEquipmentSchema,
  
  // Source information
  source: z.string().optional(),
  page: z.number().optional()
});

/**
 * D&D Background document schema (runtime)
 * Extends base VTT document with background-specific plugin data
 */
export const dndBackgroundDocumentSchema = vttDocumentSchema.extend({
  pluginDocumentType: z.literal('background'),
  pluginData: dndBackgroundDataSchema
});

/**
 * Runtime type exports
 */
export type DndBackgroundData = z.infer<typeof dndBackgroundDataSchema>;
export type DndBackgroundDocument = z.infer<typeof dndBackgroundDocumentSchema>;
export type DndBackgroundEquipment = z.infer<typeof backgroundEquipmentSchema>;
export type DndToolProficiency = z.infer<typeof toolProficiencySchema>;

/**
 * Available backgrounds in D&D 2024 (16 total)
 * NOTE: Expanded from 2014's 13 backgrounds
 */
export const backgroundIdentifiers = [
  'acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'farmer',
  'guard', 'hermit', 'merchant', 'noble', 'sage', 'sailor', 'scoundrel',
  'soldier', 'wayfarer', 'guide'
] as const;

export type BackgroundIdentifier = typeof backgroundIdentifiers[number];
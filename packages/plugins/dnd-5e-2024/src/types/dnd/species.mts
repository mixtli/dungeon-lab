import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { 
  creatureSizeSchema, 
  restTypeSchema,
  skillSchema,
  spellReferenceObjectSchema,
  abilitySchema
} from './common.mjs';

/**
 * D&D 5e 2024 Species Runtime Types
 * 
 * Complete species implementation matching XPHB complexity including
 * skill choices, spell progressions, lineages, and special senses.
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
 * Special senses like darkvision with specific ranges and conditions
 */
export const specialSensesSchema = z.object({
  /** Darkvision range in feet */
  darkvision: z.number().optional(),
  /** Blindsight range in feet */
  blindsight: z.number().optional(),
  /** Tremorsense range in feet */
  tremorsense: z.number().optional(),
  /** Truesight range in feet */
  truesight: z.number().optional()
});

/**
 * Skill proficiencies with choice support
 */
export const skillProficiencySchema = z.object({
  /** Fixed skill proficiencies */
  fixed: z.array(skillSchema).optional(),
  /** Skill choices (e.g., "choose 1 from insight, perception, survival") */
  choices: z.array(z.object({
    /** Number of skills to choose */
    count: z.number(),
    /** Skills to choose from */
    from: z.array(skillSchema),
    /** Description of the choice */
    description: z.string().optional()
  })).optional()
});

/**
 * Spell progression for lineages/subraces
 * Models how spells are gained at different character levels
 */
export const spellProgressionSchema = z.object({
  /** Spellcasting ability choice */
  spellcastingAbility: z.object({
    /** Fixed ability (if no choice) */
    fixed: abilitySchema.optional(),
    /** Choice between abilities */
    choice: z.array(abilitySchema).optional()
  }),
  /** Cantrips known at level 1 */
  cantrips: z.array(z.object({
    /** Spell reference */
    spell: spellReferenceObjectSchema,
    /** Can be replaced on long rest */
    replaceable: z.boolean().default(false),
    /** Replacement options (for spells like Prestidigitation -> any Wizard cantrip) */
    replacementOptions: z.object({
      /** Filter for allowed replacements */
      filter: z.string(), // e.g., "level=0|class=Wizard"
      /** Description of replacement rules */
      description: z.string()
    }).optional()
  })).optional(),
  /** Spells gained at specific levels */
  spellsByLevel: z.record(z.string(), z.array(z.object({
    /** Spell reference */
    spell: spellReferenceObjectSchema,
    /** Uses per day (1 for most racial spells) */
    dailyUses: z.number().default(1),
    /** Description of usage */
    usageDescription: z.string().optional()
  }))).optional()
});

/**
 * Species lineage system (replaces old ancestry system)
 * Models XPHB approach like Elven Lineages
 */
export const speciesLineageSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Level 1 benefits description */
  level1Benefits: z.string(),
  /** Spell progression for this lineage */
  spellProgression: spellProgressionSchema.optional(),
  /** Additional traits specific to this lineage */
  traits: z.array(speciesTraitSchema).optional(),
  /** Movement speed modifications */
  speedModification: z.number().optional(),
  /** Special sense modifications */
  senseModifications: specialSensesSchema.optional()
});

/**
 * Complete D&D 2024 Species Schema
 * Enhanced to match XPHB complexity with lineages, spell progressions, and choices
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
  
  /** Special senses like darkvision */
  specialSenses: specialSensesSchema.optional(),
  
  /** Skill proficiencies with choice support */
  skillProficiencies: skillProficiencySchema.optional(),
  
  /** All species abilities as named traits */
  traits: z.array(speciesTraitSchema),
  
  /** Lineage options for species variants (replaces ancestryOptions) */
  lineages: z.array(speciesLineageSchema).optional(),
  
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
export type DndSpeciesLineage = z.infer<typeof speciesLineageSchema>;
export type DndSpecialSenses = z.infer<typeof specialSensesSchema>;
export type DndSkillProficiency = z.infer<typeof skillProficiencySchema>;
export type DndSpellProgression = z.infer<typeof spellProgressionSchema>;

/**
 * D&D 2024 Species (10 in core PHB)
 * NOTE: Half-Elf and Half-Orc removed, replaced with mix-and-match rules
 */
export const speciesIdentifiers = [
  'aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath',
  'halfling', 'human', 'orc', 'tiefling'
] as const;

export type SpeciesIdentifier = typeof speciesIdentifiers[number];
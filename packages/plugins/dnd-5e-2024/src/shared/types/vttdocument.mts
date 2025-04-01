import { z } from 'zod';
import { characterClassDocumentSchema } from './character-class.mjs';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
// These schemas represent the data field of the documents in the mongoose model VTTDocument which is returned by the API
// Background schema
export const backgroundDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  skillProficiencies: z.array(z.string()),
  abilities: z.array(z.string()),
  toolProficiencies: z.array(z.string()).optional(),
  equipment: z.object({
    type: z.literal('choice'),
    options: z.array(
      z.array(
        z.union([
          z.object({
            item: z.string(),
            quantity: z.number().optional()
          }),
          z.object({
            value: z.number()
          })
        ])
      )
    )
  }),
  feats: z.array(z.string()).optional(),
  suggestedCharacteristics: z.object({
    personalityTraits: z.array(z.string()).optional(),
    ideals: z.array(z.string()).optional(),
    bonds: z.array(z.string()).optional(),
    flaws: z.array(z.string()).optional()
  }).optional()
});

// Species schema
export const speciesDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge']),
  speed: z.number(),
  traits: z.array(z.object({
    name: z.string(),
    description: z.string()
  })),
  subspecies: z.array(z.object({
    name: z.string(),
    description: z.string(),
    speed: z.number().optional(),
    abilityScoreIncrease: z.record(z.string(), z.number()).optional(),
    traits: z.array(z.object({
      name: z.string(), 
      description: z.string()
    })).optional(),
    spells: z.array(z.object({
      name: z.string().optional(),
      cantrips: z.array(z.string()),
      spells: z.array(z.object({
        level: z.number(),
        spells: z.array(z.string())
      }))
    })).optional()
  })).optional()
});

// Feat schema
export const featDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
  ability: z.array(
    z.object({
      choice: z.object({
        from: z.array(z.string()),
        count: z.number().optional()
      })
    })
  ).optional(),
  prerequisites: z.object({
    ability: z.record(z.string(), z.number()).optional(),
    race: z.array(z.string()).optional(),
    class: z.array(z.string()).optional(),
    level: z.number().optional(),
    spellcasting: z.boolean().optional(),
    other: z.string().optional()
  }).optional(),
  benefits: z.array(z.object({
    name: z.string(),
    description: z.string()
  }))
});

export type IBackgroundData = z.infer<typeof backgroundDataSchema>;
export type ISpeciesData = z.infer<typeof speciesDataSchema>;
export type IFeatData = z.infer<typeof featDataSchema>;

export const backgroundDocumentSchema = vttDocumentSchema.extend({
  documentType: z.literal('background'),
  data: backgroundDataSchema
});

export const speciesDocumentSchema = vttDocumentSchema.extend({
  documentType: z.literal('species'),
  data: speciesDataSchema
});

export const featDocumentSchema = vttDocumentSchema.extend({
  documentType: z.literal('feat'),
  data: featDataSchema
});

export type IBackgroundDocument = z.infer<typeof backgroundDocumentSchema>;
export type ISpeciesDocument = z.infer<typeof speciesDocumentSchema>;
export type IFeatDocument = z.infer<typeof featDocumentSchema>;



// Create the discriminated union for VTTDocumentData
export const vttDocumentDataSchema = z.discriminatedUnion('documentType', [
  characterClassDocumentSchema,
  backgroundDocumentSchema,
  speciesDocumentSchema,
  featDocumentSchema
]);

export type IVTTDocumentData = z.infer<typeof vttDocumentDataSchema>;

// Export const for each document type for validation functions
export const vttDocumentTypes = {
  characterClass: characterClassDocumentSchema,
  background: backgroundDocumentSchema,
  species: speciesDocumentSchema,
  feat: featDocumentSchema
};

// Convert schemas to JSON Schema for plugin registration
export const backgroundJsonSchema = backgroundDataSchema.describe('D&D 5E Background');
export const speciesJsonSchema = speciesDocumentSchema.describe('D&D 5E Species');
export const featJsonSchema = featDocumentSchema.describe('D&D 5E Feat'); 
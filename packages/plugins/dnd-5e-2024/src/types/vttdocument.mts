import { dndCharacterClassDataSchema } from './dnd/character-class.mjs';

// Import from separate type files
import { 
  dndBackgroundDataSchema, 
  dndBackgroundDocumentSchema,
  type DndBackgroundData,
  type DndBackgroundDocument
} from './dnd/background.mjs';

import {
  dndSpeciesDataSchema,
  dndSpeciesDocumentSchema,
  type DndSpeciesData,
  type DndSpeciesDocument
} from './dnd/species.mjs';

import {
  dndFeatDataSchema,
  dndFeatDocumentSchema,
  type DndFeatData,
  type DndFeatDocument
} from './dnd/feat.mjs';

// Re-export for backward compatibility
export { dndBackgroundDataSchema as backgroundDataSchema, dndBackgroundDocumentSchema as backgroundDocumentSchema };
export { dndSpeciesDataSchema as speciesDataSchema, dndSpeciesDocumentSchema as speciesDocumentSchema };
export { dndFeatDataSchema as featDataSchema, dndFeatDocumentSchema as featDocumentSchema };

export type IBackground = DndBackgroundData; // legacy alias
export type { DndBackgroundData as IBackgroundData, DndBackgroundDocument as IBackgroundDocument };
export type { DndSpeciesData as ISpeciesData, DndSpeciesDocument as ISpeciesDocument };
export type { DndFeatData as IFeatData, DndFeatDocument as IFeatDocument };



// Create the discriminated union for VTTDocumentData
// export const vttDocumentDataSchema = z.discriminatedUnion('documentType', [
//   characterClassDocumentSchema,
//   backgroundDocumentSchema,
//   speciesDocumentSchema,
//   featDocumentSchema
// ]);

// export type IVTTDocumentData = z.infer<typeof vttDocumentDataSchema>;

// Export const for each document type for validation functions
export const vttDocumentDataTypes = {
  characterClass: dndCharacterClassDataSchema,
  background: dndBackgroundDataSchema,
  species: dndSpeciesDataSchema,
  feat: dndFeatDataSchema
};

// Convert schemas to JSON Schema for plugin registration
export const backgroundJsonSchema = dndBackgroundDataSchema.describe('D&D 5E Background');
export const speciesJsonSchema = dndSpeciesDocumentSchema.describe('D&D 5E Species');
export const featJsonSchema = dndFeatDocumentSchema.describe('D&D 5E Feat'); 
import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';
import { compendiumSchema } from './compendium.schema.mjs';

/**
 * Document types for discriminator field
 * Note: Maps and Encounters remain in separate collections as they are
 * infrastructure/session state, not compendium content
 */
export const documentTypeSchema = z.enum([
  'actor',
  'item', 
  'vtt-document'
]);

/**
 * Base document schema that all document types extend
 * This provides the unified structure for the document collection
 */
export const baseDocumentSchema = baseSchema.extend({
  // Document metadata
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  
  // Discriminator field for document type
  documentType: documentTypeSchema,
  
  // Plugin-specific document subtype (e.g., 'character', 'weapon', 'spell')
  pluginDocumentType: z.string().min(1),
  
  // Plugin association
  pluginId: z.string().min(1),
  
  // Campaign association (documents belong to campaigns)
  campaignId: z.string(),
  
  // Plugin-specific data (flexible structure)
  pluginData: z.record(z.string(), z.unknown()).default({}),
  
  // User-specific data (for player notes, preferences, etc.)
  userData: z.record(z.string(), z.any()).default({}),
  
  // Compendium reference (optional - only set for compendium content)
  compendiumId: z.string().optional(),
  
  // Asset references (for images, avatars, etc.)
  imageId: z.string().optional(),
  thumbnailId: z.string().optional()
});

/**
 * Schema for creating documents (omits auto-generated fields)
 */
export const createDocumentSchema = baseDocumentSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

/**
 * Schema for updating documents (all fields optional)
 */
export const updateDocumentSchema = baseDocumentSchema.deepPartial();

/**
 * Document schema with virtual asset relationships
 */
export const documentSchemaWithVirtuals = baseDocumentSchema.extend({
  // Virtual asset relationships (properly typed)
  image: assetSchema.optional(),
  thumbnail: assetSchema.optional(),
  compendium: compendiumSchema.optional()
});

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type BaseDocument = z.infer<typeof baseDocumentSchema>;
export type CreateDocumentData = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentData = z.infer<typeof updateDocumentSchema>;
export type DocumentWithVirtuals = z.infer<typeof documentSchemaWithVirtuals>;
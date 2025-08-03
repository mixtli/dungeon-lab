import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

/**
 * Document types for discriminator field
 * Note: Maps and Encounters remain in separate collections as they are
 * infrastructure/session state, not compendium content
 */
export const documentTypeSchema = z.enum([
  'actor',      // NPCs, monsters, etc.
  'character',  // Player characters  
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
  
  // URL-friendly identifier (auto-generated from name if not provided)
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    ),
  
  // Discriminator field for document type
  documentType: documentTypeSchema,
  
  // Plugin-specific document subtype (e.g., 'character', 'weapon', 'spell')
  pluginDocumentType: z.string().min(1),
  
  // Plugin association
  pluginId: z.string().min(1),
  
  // Source book/module identifier (e.g., "XPHB", "XMM")
  source: z.string().min(1).optional(),
  
  // Campaign association (documents belong to campaigns)
  campaignId: z.string().optional(),
  
  // Plugin-specific data (flexible structure)
  pluginData: z.record(z.string(), z.unknown()).default({}),
  
  // User-specific data (for player notes, preferences, etc.)
  userData: z.record(z.string(), z.any()).default({}),
  
  // Compendium reference (optional - only set for compendium content)
  compendiumId: z.string().optional(),
  
  // Asset references (for images, avatars, etc.)
  imageId: z.string().optional(),
  thumbnailId: z.string().optional(),
  
  // Owner reference (for items owned by characters/actors)
  ownerId: z.string().optional()
});

/**
 * Schema for creating documents (omits auto-generated fields)
 */
export const createDocumentSchema = baseDocumentSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true
}).extend({
  // Make slug optional for creation - will be auto-generated from name if not provided
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )
    .optional()
});

/**
 * Schema for updating documents (all fields optional)
 */
export const updateDocumentSchema = baseDocumentSchema.deepPartial();

/**
 * Document schema with virtual asset relationships
 * Note: compendium relationship removed to avoid circular dependency
 */
export const documentSchemaWithVirtuals = baseDocumentSchema.extend({
  // Virtual asset relationships (properly typed)
  image: assetSchema.optional(),
  thumbnail: assetSchema.optional()
});

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type BaseDocument = z.infer<typeof baseDocumentSchema>;
export type CreateDocumentData = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentData = z.infer<typeof updateDocumentSchema>;
export type DocumentWithVirtuals = z.infer<typeof documentSchemaWithVirtuals>;
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
 * Common fields shared by all document types
 */
const baseDocumentFields = {
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
  
  // Plugin-specific document subtype (e.g., 'character', 'weapon', 'spell')
  pluginDocumentType: z.string().min(1),
  
  // Plugin association
  pluginId: z.string().min(1),
  
  // Source book/module identifier (e.g., "XPHB", "XMM")
  source: z.string().min(1).optional(),
  
  // Campaign association (documents belong to campaigns)
  campaignId: z.string().optional(),
  
  // Owner reference (user who owns this document)
  ownerId: z.string().optional(),
  
  // Plugin-specific data (flexible structure)
  pluginData: z.record(z.string(), z.unknown()).default({}),
  
  // Plugin-managed item state (equipped, quantity, condition, etc.)
  itemState: z.record(z.string(), z.unknown()).default({}),
  
  // Document transient state with standard lifecycle sections (plugin-extensible)
  state: z.object({
    // Standard lifecycle state sections (optional initially, plugins define structure)
    turnState: z.any().optional(),
    sessionState: z.any().optional(),
    encounterState: z.any().optional(),
    persistentState: z.any().optional()
  }).catchall(z.any()).default({
    turnState: undefined,
    sessionState: undefined,
    encounterState: undefined,
    persistentState: undefined
  }), // catchall allows plugins to add custom sections
  
  // User-specific data (for player notes, preferences, etc.)
  userData: z.record(z.string(), z.any()).default({}),
  
  // Compendium reference (optional - only set for compendium content)
  compendiumId: z.string().optional(),
  
  // Compendium entry reference (optional - tracks which entry this was created from)
  compendiumEntryId: z.string().optional(),
  
  // Image asset references (shared by all document types)
  imageId: z.string().optional(),
  thumbnailId: z.string().optional(),
  tokenImageId: z.string().optional()
};

/**
 * Character document schema - includes avatar field
 */
export const characterDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.string().default('character'),
  
  // Character-specific image field
  avatarId: z.string().optional()
});

/**
 * Actor document schema - uses base fields only
 */
export const actorDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.string().default('actor')
});

/**
 * Item document schema - uses base fields (ownerId inherited from baseDocumentFields)
 */
export const itemDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.string().default('item'),
  
  // Character/Actor that carries this item (for inventory management)
  // Note: ownerId represents User ownership, carrierId represents Character/Actor ownership
  carrierId: z.string().optional()
});

/**
 * VTT document schema - basic fields only
 */
export const vttDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.string().default('vtt-document')
});

/**
 * Union of all document types
 * This ensures each document type gets exactly the fields it should have
 */
export const baseDocumentSchema = z.union([
  characterDocumentSchema,
  actorDocumentSchema,
  itemDocumentSchema,
  vttDocumentSchema
]);

/**
 * Create document schemas (omit auto-generated fields)
 */
const createCharacterDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.literal('character'),
  avatarId: z.string().optional(),
  // Make slug optional for creation
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )
    .optional()
}).omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

const createActorDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.literal('actor'),
  // Make slug optional for creation
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )
    .optional()
}).omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

const createItemDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.literal('item'),
  // Character/Actor that carries this item (for inventory management)
  carrierId: z.string().optional(),
  // Make slug optional for creation
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )
    .optional()
}).omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

const createVttDocumentSchema = baseSchema.extend({
  ...baseDocumentFields,
  documentType: z.literal('vtt-document'),
  // Make slug optional for creation
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )
    .optional()
}).omit({
  id: true,
  createdBy: true,
  updatedBy: true
});

/**
 * Schema for creating documents (discriminated union)
 */
export const createDocumentSchema = z.discriminatedUnion('documentType', [
  createCharacterDocumentSchema,
  createActorDocumentSchema,
  createItemDocumentSchema,
  createVttDocumentSchema
]);

/**
 * Schema for updating documents (all fields optional)
 * Note: For discriminated unions, we use a more flexible approach
 */
export const updateDocumentSchema = z.object({
  // Base fields that can be updated
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )
    .optional(),
  pluginDocumentType: z.string().min(1).optional(),
  pluginId: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  campaignId: z.string().optional(),
  ownerId: z.string().optional(),
  pluginData: z.record(z.string(), z.unknown()).optional(),
  itemState: z.record(z.string(), z.unknown()).optional(),
  state: z.object({
    turnState: z.unknown().optional(),
    sessionState: z.unknown().optional(),
    encounterState: z.unknown().optional(),
    persistentState: z.unknown().optional()
  }).catchall(z.unknown()).optional(),
  userData: z.record(z.string(), z.any()).optional(),
  compendiumId: z.string().optional(),
  
  // Asset references (all document types)
  imageId: z.string().optional(),
  thumbnailId: z.string().optional(),
  tokenImageId: z.string().optional(),
  
  // Character-specific field
  avatarId: z.string().optional()
}).partial();

/**
 * Document schema with virtual asset relationships
 * Note: compendium relationship removed to avoid circular dependency
 * For discriminated unions, we use intersection to add virtuals
 */
export const documentSchemaWithVirtuals = baseDocumentSchema.and(
  z.object({
    // Virtual asset relationships (properly typed) - ALL virtual asset fields
    avatar: assetSchema.nullable().optional(),      // Character avatar images
    tokenImage: assetSchema.nullable().optional(),  // Token images for characters/actors
    image: assetSchema.nullable().optional(),       // General images for all document types
    thumbnail: assetSchema.nullable().optional()    // Thumbnail images for all document types
  })
);

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type BaseDocument = z.infer<typeof baseDocumentSchema>;
export type CreateDocumentData = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentData = z.infer<typeof updateDocumentSchema>;
export type DocumentWithVirtuals = z.infer<typeof documentSchemaWithVirtuals>;
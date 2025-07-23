import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { actorSchema } from './actor.schema.mjs';
import { itemSchema } from './item.schema.mjs';
import { vttDocumentSchema } from './vtt-document.schema.mjs';

// Compendium Status enum
export const compendiumStatusSchema = z.enum([
  'draft',
  'active',
  'archived',
  'importing',
  'error'
]);

// Import Source enum
export const importSourceSchema = z.enum([
  'foundry-vtt',
  'json-file',
  'zip-file',
  'manual'
]);

// Content Type enum for embedded content
export const embeddedContentTypeSchema = z.enum([
  'actor',
  'item', 
  'vttdocument'
]);

// Discriminated union for embedded content
export const embeddedContentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('actor'),
    data: actorSchema.omit({ id: true, createdBy: true, updatedBy: true })
  }),
  z.object({
    type: z.literal('item'),
    data: itemSchema.omit({ id: true, createdBy: true, updatedBy: true })
  }),
  z.object({
    type: z.literal('vttdocument'),
    data: vttDocumentSchema.omit({ id: true, createdBy: true, updatedBy: true })
  })
]);

// Wrapper format for import bundles
export const contentFileWrapperSchema = z.object({
  entry: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['actor', 'item', 'vttdocument']),
    imageId: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sortOrder: z.number().optional()
  }),
  content: z.any() // Will be validated against game system schemas
});

// Base Compendium schema
export const compendiumSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  gameSystemId: z.string().min(1),
  pluginId: z.string().min(1),
  version: z.string().default('1.0.0'),
  status: compendiumStatusSchema.default('draft'),
  isPublic: z.boolean().default(false),
  
  // Import metadata
  importSource: importSourceSchema.optional(),
  importData: z.record(z.string(), z.any()).optional(),
  importedAt: z.string().optional(),
  importedBy: z.string().optional(),
  
  // Content statistics (updated for embedded content types)
  totalEntries: z.number().default(0),
  entriesByType: z.record(embeddedContentTypeSchema, z.number()).default({}),
  
  // Tags for organization
  tags: z.array(z.string()).default([]),
  
  // User data for custom fields
  userData: z.record(z.string(), z.any()).optional()
});

// Compendium Entry schema with embedded content
export const compendiumEntrySchema = baseSchema.extend({
  compendiumId: z.string(),
  name: z.string().min(1).max(255),
  
  // Entry metadata
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  
  // Top-level image for browsing (Asset ID)
  imageId: z.string().optional(),
  
  // Search and categorization
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  
  // Embedded content with discriminated union
  embeddedContent: embeddedContentSchema,
  
  // Version tracking
  contentVersion: z.string().default('1.0.0'),
  contentHash: z.string().optional(),
  
  // Import tracking
  sourceId: z.string().optional(), // Original ID from import source
  sourceData: z.record(z.string(), z.any()).optional(),
  
  // User data
  userData: z.record(z.string(), z.any()).optional()
});

// Create schemas (omit auto-generated fields)
export const compendiumCreateSchema = compendiumSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  totalEntries: true,
  entriesByType: true
});

export const compendiumUpdateSchema = compendiumSchema.partial().omit({
  id: true,
  createdBy: true,
  importedAt: true,
  importedBy: true
});

export const compendiumEntryCreateSchema = compendiumEntrySchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  contentHash: true // Will be generated automatically
});

export const compendiumEntryUpdateSchema = compendiumEntrySchema.partial().omit({
  id: true,
  createdBy: true,
  compendiumId: true,
  embeddedContent: true, // Content updates should go through template service
  contentHash: true // Will be regenerated on updates
});

// Export types
export type ICompendium = z.infer<typeof compendiumSchema>;
export type ICompendiumEntry = z.infer<typeof compendiumEntrySchema>;
export type EmbeddedContent = z.infer<typeof embeddedContentSchema>;
export type ContentFileWrapper = z.infer<typeof contentFileWrapperSchema>;
export type CompendiumStatus = z.infer<typeof compendiumStatusSchema>;
export type ImportSource = z.infer<typeof importSourceSchema>;
export type EmbeddedContentType = z.infer<typeof embeddedContentTypeSchema>;
export type CompendiumCreate = z.infer<typeof compendiumCreateSchema>;
export type CompendiumUpdate = z.infer<typeof compendiumUpdateSchema>;
export type CompendiumEntryCreate = z.infer<typeof compendiumEntryCreateSchema>;
export type CompendiumEntryUpdate = z.infer<typeof compendiumEntryUpdateSchema>;

// Utility types for extracting specific embedded content types
export type EmbeddedActorContent = Extract<EmbeddedContent, { type: 'actor' }>;
export type EmbeddedItemContent = Extract<EmbeddedContent, { type: 'item' }>;
export type EmbeddedVTTDocumentContent = Extract<EmbeddedContent, { type: 'vttdocument' }>;
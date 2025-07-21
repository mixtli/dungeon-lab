import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';

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

// Content Type enum  
export const contentTypeSchema = z.enum([
  'Actor',
  'Item', 
  'VTTDocument'
]);

// Base Compendium schema
export const compendiumSchema = baseSchema.extend({
  name: z.string().min(1).max(255),
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
  
  // Content statistics
  totalEntries: z.number().default(0),
  entriesByType: z.record(contentTypeSchema, z.number()).default({}),
  
  // Tags for organization
  tags: z.array(z.string()).default([]),
  
  // User data for custom fields
  userData: z.record(z.string(), z.any()).optional()
});

// Compendium Entry schema
export const compendiumEntrySchema = baseSchema.extend({
  compendiumId: z.string(),
  name: z.string().min(1).max(255),
  contentType: contentTypeSchema,
  contentId: z.string(), // References Actor._id, Item._id, or VTTDocument._id
  
  // Entry metadata
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  
  // Search and categorization
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  
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
  updatedBy: true
});

export const compendiumEntryUpdateSchema = compendiumEntrySchema.partial().omit({
  id: true,
  createdBy: true,
  compendiumId: true,
  contentType: true,
  contentId: true
});

// Export types
export type ICompendium = z.infer<typeof compendiumSchema>;
export type ICompendiumEntry = z.infer<typeof compendiumEntrySchema>;
export type CompendiumStatus = z.infer<typeof compendiumStatusSchema>;
export type ImportSource = z.infer<typeof importSourceSchema>;
export type ContentType = z.infer<typeof contentTypeSchema>;
export type CompendiumCreate = z.infer<typeof compendiumCreateSchema>;
export type CompendiumUpdate = z.infer<typeof compendiumUpdateSchema>;
export type CompendiumEntryCreate = z.infer<typeof compendiumEntryCreateSchema>;
export type CompendiumEntryUpdate = z.infer<typeof compendiumEntryUpdateSchema>;
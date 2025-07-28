import { z } from 'zod';
import { baseDocumentSchema, documentTypeSchema } from './document.schema.mjs';
// VTT Document schema - extends base document with VTT-specific fields
export const vttDocumentSchema = baseDocumentSchema.extend({
  // Discriminator value - use literal for proper type inference
  documentType: z.literal('vtt-document'),
  
  // Plugin subtypes: 'class', 'spell', 'feat', 'background', etc.
  pluginDocumentType: z.string().min(1)

  // Note: Other fields now come from baseDocumentSchema:
  // - name, description, slug, pluginId, campaignId, compendiumId, imageId
  // - pluginData (replaces 'data'), userData
});

// Create schema (omits auto-generated fields)
export const vttDocumentCreateSchema = vttDocumentSchema
  .omit({
    id: true,
    createdBy: true,
    updatedBy: true
  })
  .extend({
    // Make slug optional on create - it will be auto-generated from name if not provided
    slug: vttDocumentSchema.shape.slug.optional()
  });

// Update schema (makes all fields optional)
export const vttDocumentUpdateSchema = vttDocumentSchema.deepPartial();

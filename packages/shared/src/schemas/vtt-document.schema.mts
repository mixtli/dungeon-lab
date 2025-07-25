import { z } from 'zod';
import { baseDocumentSchema } from './document.schema.mjs';
// VTT Document schema - extends base document with VTT-specific fields
export const vttDocumentSchema = baseDocumentSchema.extend({
  // Discriminator value
  documentType: z.literal('vtt-document'),
  
  // Plugin subtypes: 'class', 'spell', 'feat', 'background', etc.
  pluginDocumentType: z.string().min(1),
  
  // VTT infrastructure field (URL-friendly identifier)
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must be lowercase with no spaces, only hyphens and numbers allowed'
    )

  // Note: Other fields now come from baseDocumentSchema:
  // - name, description, pluginId, campaignId, compendiumId, imageId
  // - pluginData (replaces 'data'), userData
});

// Create schema (omits auto-generated fields)
export const vttDocumentCreateSchema = vttDocumentSchema
  .omit({
    id: true,
    createdBy: true,
    updatedBy: true
  });

// Update schema (makes all fields optional)
export const vttDocumentUpdateSchema = vttDocumentSchema.deepPartial();

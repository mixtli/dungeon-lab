import { z } from 'zod';
import { baseDocumentSchema, documentTypeSchema } from './document.schema.mjs';

// Item schema - extends base document with VTT-specific fields
export const itemSchema = baseDocumentSchema.extend({
  // Discriminator value - use literal for proper type inference
  documentType: z.literal('item'),
  
  // Plugin subtypes: 'weapon', 'armor', 'tool', 'consumable', etc.
  pluginDocumentType: z.string().min(1)

  // Note: Other fields now come from baseDocumentSchema:
  // - name, description, pluginId, campaignId, compendiumId, imageId
  // - pluginData (replaces 'data'), userData
  // - Game-specific fields like weight, cost should go in pluginData
});

export const itemCreateSchema = itemSchema
  .omit({
    // Omit auto-generated and file-reference fields
    id: true,
    createdBy: true,
    updatedBy: true,
    imageId: true // Will be set from uploaded file
  })
  .extend({
    // Make slug optional on create - it will be auto-generated from name if not provided
    slug: itemSchema.shape.slug.optional(),
    // File upload for item image
    image: z.instanceof(File).optional()
  });

// Item patch schema for updates
export const itemPatchSchema = itemSchema.deepPartial();

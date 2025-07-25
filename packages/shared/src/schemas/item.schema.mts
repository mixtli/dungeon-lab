import { z } from 'zod';
import { baseDocumentSchema } from './document.schema.mjs';

// Item schema - extends base document with VTT-specific fields
export const itemSchema = baseDocumentSchema.extend({
  // Discriminator value
  documentType: z.literal('item'),
  
  // Plugin subtypes: 'weapon', 'armor', 'tool', 'consumable', etc.
  pluginDocumentType: z.string().min(1)

  // Note: Other fields now come from baseDocumentSchema:
  // - name, description, pluginId, campaignId, compendiumId, imageId
  // - pluginData (replaces 'data'), userData
  // - Game-specific fields like weight, cost should go in pluginData
});

export const itemCreateSchema = itemSchema
  .extend({
    // File upload for item image
    image: z.instanceof(File).optional()
  })
  .omit({
    // Omit auto-generated and file-reference fields
    id: true,
    createdBy: true,
    updatedBy: true,
    imageId: true // Will be set from uploaded file
  });

// Item patch schema for updates
export const itemPatchSchema = itemSchema.deepPartial();

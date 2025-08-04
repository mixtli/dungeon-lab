import { z } from 'zod';
import { itemDocumentSchema } from './document.schema.mjs';

// Item schema - uses item document schema (no additional fields needed currently)
export const itemSchema = itemDocumentSchema;

// Note: All fields come from itemDocumentSchema:
// - name, description, pluginId, campaignId, compendiumId, imageId, thumbnailId
// - ownerId (item-specific for ownership)
// - pluginData (replaces 'data'), userData, itemState
// - Game-specific fields like weight, cost should go in pluginData

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

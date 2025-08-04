import { z } from 'zod';
import { actorDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';
// import { deepPartial } from '../utils/deepPartial.mjs';

// Actor schema - extends actor document schema with additional fields
export const actorSchema = actorDocumentSchema.extend({
  // Universal inventory system
  inventory: z.array(z.object({
    itemId: z.string(),                    // Reference to Item document
    quantity: z.number().min(0),
    equipped: z.boolean().default(false),
    slot: z.string().optional(),
    condition: z.number().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })).default([]).optional()

  // Note: Other fields now come from actorDocumentSchema:
  // - name, description, pluginId, campaignId, compendiumId, imageId
  // - avatarId, defaultTokenImageId (actor-specific)
  // - pluginData (replaces 'data'), userData (replaces old userData)
});

export const actorCreateSchema = actorSchema
  .omit({
    // Omit auto-generated fields only
    id: true,
    createdBy: true,
    updatedBy: true
  })
  .extend({
    // Make slug optional on create - it will be auto-generated from name if not provided
    slug: actorSchema.shape.slug.optional(),
    // Allow both asset IDs (from web client) and file uploads (from API clients)
    avatarId: actorSchema.shape.avatarId.optional(),  // Keep asset ID field
    defaultTokenImageId: actorSchema.shape.defaultTokenImageId.optional(),  // Keep asset ID field
    avatar: z.instanceof(File).optional(),  // Optional file upload
    token: z.instanceof(File).optional()    // Optional file upload
  });

export const actorSchemaWithVirtuals = actorSchema.extend({
  token: assetSchema.optional(),
  avatar: assetSchema.optional()
});

export const actorPatchSchema = actorSchema.deepPartial();

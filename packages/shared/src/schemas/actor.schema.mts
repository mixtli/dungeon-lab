import { z } from 'zod';
import { actorDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';
// import { deepPartial } from '../utils/deepPartial.mjs';

// Actor schema - extends actor document schema 
export const actorSchema = actorDocumentSchema.extend({
  // Note: Inventory is handled via item.ownerId relationships, not embedded arrays
  // Items owned by this actor can be found by filtering items where item.ownerId === actor.id
  
  // Note: Other fields come from actorDocumentSchema:
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

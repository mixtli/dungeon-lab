import { z } from 'zod';
import { actorDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';
// import { deepPartial } from '../utils/deepPartial.mjs';

// Actor schema - extends actor document schema 
export const actorSchema = actorDocumentSchema.extend({
  // Note: Inventory is handled via item.carrierId relationships, not embedded arrays
  // Items carried by this actor can be found by filtering items where item.carrierId === actor.id
  
  // Note: Other fields come from actorDocumentSchema:
  // - name, description, pluginId, campaignId, compendiumId, imageId
  // - tokenImageId (from base, no actor-specific image fields)
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
    tokenImageId: actorSchema.shape.tokenImageId.optional(),  // Keep asset ID field
    tokenImage: z.instanceof(File).optional()    // Optional file upload
  });

export const actorSchemaWithVirtuals = actorSchema.extend({
  tokenImage: assetSchema.nullable().optional()
});

export const actorPatchSchema = actorSchema.deepPartial();

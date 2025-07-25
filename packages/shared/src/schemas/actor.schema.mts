import { z } from 'zod';
import { baseDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';
// import { deepPartial } from '../utils/deepPartial.mjs';

// Actor schema - extends base document with VTT-specific fields
export const actorSchema = baseDocumentSchema.extend({
  // Discriminator value
  documentType: z.literal('actor'),
  
  // Plugin subtypes: 'character', 'npc', 'monster', etc.
  pluginDocumentType: z.string().min(1),

  // VTT infrastructure fields (actor-specific)
  avatarId: z.string().optional(),
  defaultTokenImageId: z.string().optional()

  // Note: Other fields now come from baseDocumentSchema:
  // - name, description, pluginId, campaignId, compendiumId, imageId
  // - pluginData (replaces 'data'), userData (replaces old userData)
});

export const actorCreateSchema = actorSchema
  .extend({
    // File uploads for avatar and token images
    avatar: z.instanceof(File).optional(),
    token: z.instanceof(File).optional()
  })
  .omit({
    // Omit auto-generated and file-reference fields
    id: true,
    createdBy: true,
    updatedBy: true,
    avatarId: true,
    defaultTokenImageId: true
  });

export const actorSchemaWithVirtuals = actorSchema.extend({
  token: assetSchema.optional(),
  avatar: assetSchema.optional()
});

export const actorPatchSchema = actorSchema.deepPartial();

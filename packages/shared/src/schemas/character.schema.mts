import { z } from 'zod';
import { characterDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

// Character schema - extends character document schema with additional fields
export const characterSchema = characterDocumentSchema.extend({
  // Character-specific campaign association rules
  compendiumId: z.undefined(),          // Characters are never from compendium
  
  // Enhanced inventory system (characters have full inventory management)
  inventory: z.array(z.object({
    itemId: z.string(),                    // Reference to Item document
    quantity: z.number().min(0),
    equipped: z.boolean().default(false),
    slot: z.string().optional(),
    condition: z.number().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })).default([])

  // Note: All game-specific fields (level, experience, classes, etc.) 
  // are handled in pluginData to maintain plugin agnostic design
  // Other fields come from characterDocumentSchema:
  // - name, description, pluginId, campaignId, imageId, thumbnailId
  // - avatarId, defaultTokenImageId (character-specific)
  // - pluginData, userData, itemState
});

export const characterCreateSchema = characterSchema
  .omit({
    // Omit auto-generated fields only
    id: true,
    createdBy: true,
    updatedBy: true,
    compendiumId: true  // Never from compendium
  })
  .extend({
    // Make slug optional on create - it will be auto-generated from name if not provided
    slug: characterSchema.shape.slug.optional(),
    // Allow both asset IDs (from web client) and file uploads (from API clients)
    avatarId: characterSchema.shape.avatarId.optional(),  // Keep asset ID field
    defaultTokenImageId: characterSchema.shape.defaultTokenImageId.optional(),  // Keep asset ID field
    avatar: z.instanceof(File).optional(),  // Optional file upload
    token: z.instanceof(File).optional()    // Optional file upload
  });

export const characterSchemaWithVirtuals = characterSchema.extend({
  // Virtual asset relationships
  token: assetSchema.optional(),
  avatar: assetSchema.optional()
});

export const characterPatchSchema = characterSchema.deepPartial();
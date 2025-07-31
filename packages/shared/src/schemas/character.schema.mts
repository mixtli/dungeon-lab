import { z } from 'zod';
import { baseDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

// Character schema - extends base document with character-specific fields
export const characterSchema = baseDocumentSchema.extend({
  // Discriminator value - use literal for proper type inference
  documentType: z.literal('character'),
  
  // Plugin subtypes handled by plugin (e.g., 'fighter', 'wizard', 'investigator', etc.)
  pluginDocumentType: z.string().min(1),

  // Character-specific campaign association rules
  campaignId: z.string().optional(),    // Characters can exist without campaigns
  compendiumId: z.undefined(),          // Characters are never from compendium

  // VTT infrastructure fields (character-specific)
  avatarId: z.string().optional(),
  defaultTokenImageId: z.string().optional(),
  
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
});

export const characterCreateSchema = characterSchema
  .omit({
    // Omit auto-generated and file-reference fields
    id: true,
    createdBy: true,
    updatedBy: true,
    avatarId: true,
    defaultTokenImageId: true,
    compendiumId: true  // Never from compendium
  })
  .extend({
    // Make slug optional on create - it will be auto-generated from name if not provided
    slug: characterSchema.shape.slug.optional(),
    // File uploads for avatar and token images
    avatar: z.instanceof(File).optional(),
    token: z.instanceof(File).optional()
  });

export const characterSchemaWithVirtuals = characterSchema.extend({
  // Virtual asset relationships
  token: assetSchema.optional(),
  avatar: assetSchema.optional()
});

export const characterPatchSchema = characterSchema.deepPartial();
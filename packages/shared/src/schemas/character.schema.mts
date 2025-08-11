import { characterDocumentSchema } from './document.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

// Character schema - extends character document schema
export const characterSchema = characterDocumentSchema.extend({
  // Note: Inventory is handled via item.ownerId relationships, not embedded arrays
  // Items owned by this character can be found by filtering items where item.ownerId === character.id
  
  // Note: All game-specific fields (level, experience, classes, etc.) 
  // are handled in pluginData to maintain plugin agnostic design
  // Other fields come from characterDocumentSchema:
  // - name, description, pluginId, campaignId, imageId, thumbnailId
  // - avatarId (character-specific), tokenImageId (from base)
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
    // Asset ID fields (assets uploaded separately)
    avatarId: characterSchema.shape.avatarId.optional(),
    tokenImageId: characterSchema.shape.tokenImageId.optional()
  });

export const characterSchemaWithVirtuals = characterSchema.extend({
  // Virtual asset relationships
  tokenImage: assetSchema.nullable().optional(),
  avatar: assetSchema.nullable().optional()
});

export const characterPatchSchema = characterSchema.deepPartial();
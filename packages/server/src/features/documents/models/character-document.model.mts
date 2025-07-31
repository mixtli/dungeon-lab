import mongoose from 'mongoose';
import { z } from 'zod';
import { characterSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ICharacter } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific character schema with ObjectId references
const serverCharacterSchema = characterSchema.extend({
  campaignId: zId('Campaign').optional(), // Optional - characters can exist without campaigns
  compendiumId: zId('Compendium').optional(), // Will be excluded via omit in schema creation
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  avatarId: zId('Asset').optional(),
  defaultTokenImageId: zId('Asset').optional(),
  
  // Enhanced inventory system (for characters only)
  inventory: z.array(z.object({
    itemId: zId('Document'),                // Reference to Item document
    quantity: z.number().min(0),
    equipped: z.boolean().default(false),
    slot: z.string().optional(),
    condition: z.number().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })).default([])
});

// Create the discriminator schema (omit documentType and compendiumId)
const characterMongooseSchema = createMongoSchema<ICharacter>(
  serverCharacterSchema.merge(baseMongooseZodSchema).omit({ documentType: true, compendiumId: true })
);

// Override pluginData field to use Mixed type for flexibility
characterMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
characterMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add character-specific virtual properties
characterMongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('defaultTokenImage', {
  ref: 'Asset',
  localField: 'defaultTokenImageId',
  foreignField: '_id',
  justOne: true
});

// Virtual for populating inventory items
characterMongooseSchema.virtual('inventoryItems', {
  ref: 'Document',
  localField: 'inventory.itemId',
  foreignField: '_id'
});

// Virtual for campaign relationship
characterMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the character discriminator model directly
export const CharacterDocumentModel = DocumentModel.discriminator<ICharacter>('Character', characterMongooseSchema);

// Export with consistent naming
export { CharacterDocumentModel as CharacterModel };
import mongoose from 'mongoose';
import { z } from 'zod';
import { characterSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { zId, zodSchema } from '@zodyac/zod-mongoose';
import type { ICharacter } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific character schema with ObjectId references
const serverCharacterSchema = characterSchema.extend({
  campaignId: zId('Campaign').optional(), // Optional - characters can exist without campaigns
  compendiumId: zId('Compendium').optional(), // Will be excluded via omit in schema creation
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  avatarId: zId('Asset').optional(),
  tokenImageId: zId('Asset').optional(),
  ownerId: zId('User').optional(), // Owner reference (user who owns this document)
  
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

// Create the discriminator schema using zodSchema directly (omit documentType and compendiumId)
const zodSchemaDefinition = zodSchema(serverCharacterSchema.merge(baseMongooseZodSchema).omit({ documentType: true, compendiumId: true, id: true }));
const characterMongooseSchema = new mongoose.Schema<ICharacter>(zodSchemaDefinition, {
  timestamps: true,
  toObject: {
    virtuals: true,
    getters: true,
    transform: (doc, ret) => {
      // Ensure id virtual is set before deleting _id
      if (!ret.id && ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toJSON: {
    virtuals: true,
    getters: true,
    transform: (doc, ret) => {
      // Ensure id virtual is set before deleting _id
      if (!ret.id && ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Override flexible fields to use Mixed type for flexibility
characterMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
characterMongooseSchema.path('itemState', mongoose.Schema.Types.Mixed);
characterMongooseSchema.path('state', mongoose.Schema.Types.Mixed);
characterMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add getters for all ObjectId fields to ensure string serialization
characterMongooseSchema.path('campaignId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('imageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('thumbnailId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('avatarId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('tokenImageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('ownerId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('createdBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

characterMongooseSchema.path('updatedBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

// Add character-specific indexes
characterMongooseSchema.index({ avatarId: 1 });
characterMongooseSchema.index({ tokenImageId: 1 });

// Enhanced inventory indexes (for characters)
characterMongooseSchema.index({ 'inventory.itemId': 1 });                    // Find characters with specific items
characterMongooseSchema.index({ campaignId: 1, 'inventory.itemId': 1 });     // Campaign-scoped inventory queries
characterMongooseSchema.index({ 'inventory.equipped': 1, 'inventory.slot': 1 }); // Find equipped items by slot


// Add relationship virtuals
characterMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('tokenImage', {
  ref: 'Asset',
  localField: 'tokenImageId',
  foreignField: '_id',
  justOne: true
});

characterMongooseSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true
});

// Character-specific virtual for populating inventory items
characterMongooseSchema.virtual('inventoryItems', {
  ref: 'Document',
  localField: 'inventory.itemId',
  foreignField: '_id'
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the character discriminator model directly
export const CharacterDocumentModel = DocumentModel.discriminator<ICharacter>('character', characterMongooseSchema);

// Export with consistent naming
export { CharacterDocumentModel as CharacterModel };
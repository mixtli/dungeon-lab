import mongoose from 'mongoose';
import { itemSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { zId, zodSchema } from '@zodyac/zod-mongoose';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific item schema with ObjectId references
const serverItemSchema = itemSchema.extend({
  campaignId: zId('Campaign').optional(), // Optional - items created during character creation don't belong to campaigns
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  ownerId: zId('Document').optional() // Reference to owning character/actor document
});

// Create the discriminator schema using zodSchema directly (omit documentType as it's handled by discriminator)
const zodSchemaDefinition = zodSchema(serverItemSchema.merge(baseMongooseZodSchema).omit({ documentType: true, id: true }));
const itemMongooseSchema = new mongoose.Schema<IItem>(zodSchemaDefinition, {
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

// Override pluginData field to use Mixed type for flexibility
itemMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
itemMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add getters for all ObjectId fields to ensure string serialization
itemMongooseSchema.path('campaignId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

itemMongooseSchema.path('compendiumId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

itemMongooseSchema.path('imageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

itemMongooseSchema.path('thumbnailId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

itemMongooseSchema.path('ownerId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

itemMongooseSchema.path('createdBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

itemMongooseSchema.path('updatedBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

// Add relationship virtuals
itemMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

itemMongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

itemMongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

itemMongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

itemMongooseSchema.virtual('owner', {
  ref: 'Document', // Items are owned by characters/actors
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the item discriminator model directly
export const ItemDocumentModel = DocumentModel.discriminator<IItem>('item', itemMongooseSchema);

// Export with consistent naming
export { ItemDocumentModel as ItemModel };
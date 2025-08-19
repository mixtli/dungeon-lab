import mongoose from 'mongoose';
import { actorSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { zId, zodSchema } from '@zodyac/zod-mongoose';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

// Document interface for Mongoose with populated virtuals
export interface IActorDocument extends IActor, mongoose.Document {
  id: string;
}

// Create server-specific actor schema with ObjectId references
const serverActorSchema = actorSchema.extend({
  campaignId: zId('Campaign'), // Required - actors must belong to campaigns
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  tokenImageId: zId('Asset').optional(),
  ownerId: zId('User').optional() // Owner reference (user who owns this document)
  // Note: Inventory handled via item.ownerId relationships, not embedded arrays
});

// Create the discriminator schema using zodSchema directly (omit documentType as it's handled by discriminator)
const zodSchemaDefinition = zodSchema(serverActorSchema.merge(baseMongooseZodSchema).omit({ documentType: true, id: true }));
const actorMongooseSchema = new mongoose.Schema<IActorDocument>(zodSchemaDefinition, {
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
actorMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
actorMongooseSchema.path('itemState', mongoose.Schema.Types.Mixed);
actorMongooseSchema.path('state', mongoose.Schema.Types.Mixed);
actorMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add getters for all ObjectId fields to ensure string serialization
actorMongooseSchema.path('campaignId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('compendiumId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('imageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('thumbnailId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('tokenImageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('ownerId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('createdBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

actorMongooseSchema.path('updatedBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

// Add relationship virtuals
actorMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

actorMongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

actorMongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

actorMongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

actorMongooseSchema.virtual('tokenImage', {
  ref: 'Asset',
  localField: 'tokenImageId',
  foreignField: '_id',
  justOne: true
});

actorMongooseSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true
});

// Add actor-specific indexes
actorMongooseSchema.index({ tokenImageId: 1 });


// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the actor discriminator model directly
export const ActorDocumentModel = DocumentModel.discriminator<IActorDocument>('actor', actorMongooseSchema);

// Export with consistent naming
export { ActorDocumentModel as ActorModel };
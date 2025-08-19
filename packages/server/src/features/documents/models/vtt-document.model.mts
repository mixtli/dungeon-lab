import mongoose from 'mongoose';
import { z } from 'zod';
import { vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { zId, zodSchema } from '@zodyac/zod-mongoose';
import type { IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';

// Document interface for Mongoose with populated virtuals
export interface IVTTDocumentDocument extends IVTTDocument, mongoose.Document {
  id: string;
}

// Create server-specific VTT document schema with ObjectId references
const serverVTTDocumentSchema = vttDocumentSchema.extend({
  campaignId: zId('Campaign').optional(), // Optional - VTTDocuments are global and campaign-independent
  compendiumId: zId('Compendium').optional(),
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  ownerId: zId('User').optional(), // Owner reference (user who owns this document)
  slug: z.string().min(1)
});

// Create the discriminator schema using zodSchema directly (omit documentType as it's handled by discriminator)
const zodSchemaDefinition = zodSchema(serverVTTDocumentSchema.merge(baseMongooseZodSchema).omit({ documentType: true, id: true }));
const vttDocumentMongooseSchema = new mongoose.Schema<IVTTDocumentDocument>(zodSchemaDefinition, {
  timestamps: true,
  toObject: {
    virtuals: true,
    getters: true,
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toJSON: {
    virtuals: true,
    getters: true,
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Override flexible fields to use Mixed type for flexibility
vttDocumentMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
vttDocumentMongooseSchema.path('itemState', mongoose.Schema.Types.Mixed);
vttDocumentMongooseSchema.path('state', mongoose.Schema.Types.Mixed);
vttDocumentMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// Add virtual id field that converts _id to string
vttDocumentMongooseSchema.virtual('id').get(function() {
  return this._id?.toString();
});

// Add getters for all ObjectId fields to ensure string serialization
vttDocumentMongooseSchema.path('campaignId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

vttDocumentMongooseSchema.path('compendiumId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

vttDocumentMongooseSchema.path('imageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

vttDocumentMongooseSchema.path('thumbnailId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

vttDocumentMongooseSchema.path('ownerId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

vttDocumentMongooseSchema.path('createdBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

vttDocumentMongooseSchema.path('updatedBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

// Add relationship virtuals
vttDocumentMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

vttDocumentMongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

vttDocumentMongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

vttDocumentMongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

vttDocumentMongooseSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true
});

// Add pre-validation middleware to set default slug if not provided
vttDocumentMongooseSchema.pre('validate', function(next) {
  // Only set default slug if name is modified and slug is not explicitly set
  if (this.isModified('name') && !this.get('slug')) {
    // Convert name to lowercase, replace spaces with dashes, and remove any non-alphanumeric characters
    const slug = (this.get('name') as string)
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/[^a-z0-9-]/g, '') // Remove any characters that aren't lowercase letters, numbers, or dashes
      .replace(/-+/g, '-'); // Replace multiple consecutive dashes with a single dash

    this.set('slug', slug);
  }
  next();
});

// Add validation middleware for plugin data and slug uniqueness
vttDocumentMongooseSchema.pre('save', async function(next) {
  try {
    // Note: Plugin validation now happens client-side only
    // Server-side validation removed to support manifest-based plugin system

    // Check for duplicate slug if slug is modified
    if (this.isModified('slug')) {
      const VTTDocumentModel = this.constructor as mongoose.Model<IVTTDocument>;
      const document = this as IVTTDocument;
      const existingDoc = await VTTDocumentModel.findOne({
        slug: document.slug,
        pluginId: document.pluginId,
        documentType: document.documentType,
        _id: { $ne: this._id } // Exclude current document when updating
      });

      if (existingDoc) {
        throw new Error(
          `A document with slug "${document.slug}" already exists for plugin "${document.pluginId}" and type "${document.documentType}"`
        );
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Import the base DocumentModel to create discriminator
import { DocumentModel } from './document.model.mjs';

// Create the VTT document discriminator model directly
export const VTTDocumentModel = DocumentModel.discriminator<IVTTDocumentDocument>('vtt-document', vttDocumentMongooseSchema);
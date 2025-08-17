import mongoose from 'mongoose';
import { z } from 'zod';
import { baseSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { zId, zodSchema } from '@zodyac/zod-mongoose';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

// Create server-specific base document schema with ObjectId references
// Since baseDocumentSchema is now a discriminated union, we need to create a flexible schema
const serverBaseDocumentSchema = baseSchema.extend({
  // Document metadata
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  slug: z.string().optional(),
  
  // Discriminator field for document type
  documentType: z.enum(['actor', 'character', 'item', 'vtt-document']),
  
  // Plugin-specific document subtype
  pluginDocumentType: z.string().min(1),
  pluginId: z.string().min(1),
  source: z.string().min(1).optional(),
  
  // Campaign and compendium associations with ObjectId references
  campaignId: zId('Campaign').optional(),
  compendiumId: zId('Compendium').optional(),
  
  // Plugin-specific data
  pluginData: z.record(z.string(), z.unknown()).default({}),
  itemState: z.record(z.string(), z.unknown()).default({}),
  userData: z.record(z.string(), z.any()).default({}),
  
  // Asset references with ObjectId references
  imageId: zId('Asset').optional(),
  thumbnailId: zId('Asset').optional(),
  
  // Character/Actor specific image fields (optional for all documents)
  avatarId: zId('Asset').optional(),
  tokenImageId: zId('Asset').optional(),
  
  // Owner reference (user who owns this document)
  ownerId: zId('User').optional()
});

// Create the base Mongoose schema using zodSchema directly (omit id to avoid conflict with virtual)
const zodSchemaDefinition = zodSchema(serverBaseDocumentSchema.merge(baseMongooseZodSchema).omit({ id: true }));
const baseMongooseSchema = new mongoose.Schema<BaseDocument>(zodSchemaDefinition, {
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

// Set the discriminator key on the schema
baseMongooseSchema.set('discriminatorKey', 'documentType');

// Add virtual id field that converts _id to string
baseMongooseSchema.virtual('id').get(function() {
  return this._id?.toString();
}).set(function(v: string) {
  this._id = new mongoose.Types.ObjectId(v);
});

// Add getters for all ObjectId fields to ensure string serialization
baseMongooseSchema.path('campaignId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('compendiumId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('imageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('thumbnailId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('avatarId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('tokenImageId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('ownerId').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

// Add getters for audit fields
baseMongooseSchema.path('createdBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

baseMongooseSchema.path('updatedBy').get(function (value: mongoose.Types.ObjectId | undefined) {
  return value?.toString();
});

// Comprehensive indexing strategy for performance
// Core document queries (most common)
baseMongooseSchema.index({ campaignId: 1, documentType: 1 });
baseMongooseSchema.index({ pluginId: 1, documentType: 1 });
baseMongooseSchema.index({ pluginId: 1, pluginDocumentType: 1 });

// Compendium queries  
baseMongooseSchema.index({ compendiumId: 1 });
baseMongooseSchema.index({ pluginId: 1, compendiumId: 1 });

// Note: Inventory indexes are now in actor/character-specific models

// Slug index for VTT documents (non-unique since items can have duplicate slugs)
baseMongooseSchema.index({ 
  slug: 1, 
  pluginId: 1, 
  documentType: 1 
}, { sparse: true });

// Text search index
baseMongooseSchema.index({ 
  name: 'text', 
  description: 'text',
  'pluginData.type': 'text'
});

// Asset references for population
baseMongooseSchema.index({ imageId: 1 });
baseMongooseSchema.index({ avatarId: 1 });
baseMongooseSchema.index({ tokenImageId: 1 });

// User ownership and recent documents
baseMongooseSchema.index({ createdBy: 1 });
baseMongooseSchema.index({ ownerId: 1 });
baseMongooseSchema.index({ updatedAt: -1 });

// Validation middleware for unified documents
baseMongooseSchema.pre('save', async function(next) {
  try {
    // Note: Campaign boundary validation for inventory is now in actor/character-specific models
    
    // Document type specific validation
    if (this.get('documentType') === 'vtt-document') {
      // Auto-generate slug if not provided for VTT documents
      if (this.isModified('name') && !this.get('slug')) {
        const slug = (this.get('name') as string)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-');
        this.set('slug', slug);
      }
      
      // Validate slug uniqueness for VTT documents
      if (this.isModified('slug') && this.get('slug')) {
        const existing = await DocumentModel.findOne({
          slug: this.get('slug'),
          pluginId: this.get('pluginId'),
          documentType: this.get('documentType'),
          _id: { $ne: this._id }
        });
        
        if (existing) {
          throw new Error(`Document with slug "${this.get('slug')}" already exists for plugin "${this.get('pluginId')}" and type "${this.get('documentType')}"`);
        }
      }
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Override pluginData field to use Mixed type for flexibility
baseMongooseSchema.path('pluginData', mongoose.Schema.Types.Mixed);
baseMongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

// This section was duplicate - getters are already added above

// Add virtual properties for common asset relationships
baseMongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('compendium', {
  ref: 'Compendium',
  localField: 'compendiumId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('tokenImage', {
  ref: 'Asset',
  localField: 'tokenImageId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

baseMongooseSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true
});

// Create base Document model with custom discriminator key
export const DocumentModel = mongoose.model<BaseDocument>('Document', baseMongooseSchema);

// Export convenience function to get the appropriate model for a document type
export async function getDocumentModel(documentType: string) {
  switch (documentType) {
    case 'actor': {
      // Import dynamically to avoid circular dependencies
      const { ActorDocumentModel } = await import('./actor-document.model.mjs');
      return ActorDocumentModel;
    }
    case 'character': {
      // Import dynamically to avoid circular dependencies
      const { CharacterDocumentModel } = await import('./character-document.model.mjs');
      return CharacterDocumentModel;
    }
    case 'item': {
      // Import dynamically to avoid circular dependencies
      const { ItemDocumentModel } = await import('./item-document.model.mjs');
      return ItemDocumentModel;
    }
    case 'vtt-document': {
      // Import dynamically to avoid circular dependencies
      const { VTTDocumentModel } = await import('./vtt-document.model.mjs');
      return VTTDocumentModel;
    }
    default:
      return DocumentModel;  // Plugin-specific types use base model
  }
}